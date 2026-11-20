import type {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOutput,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type Capture = {
    'group-name'?: string;
    expression: string;
    multiple?: boolean;
    wholeText?: boolean;
};

type Options = {
    ignoreCase?: boolean;
    unicode?: boolean;
    dotAll?: boolean;
    keepInput?: boolean;
};

type Value = string | string[] | null;

/** Names of the named groups declared in a pattern, e.g. `(?<id>\d+)` -> ["id"]. */
function namedGroupsOf(pattern: string): string[] {
    const names: string[] = [];
    // Skips lookbehinds ((?<= / (?<!) because the name must start with an identifier character,
    // and escaped parentheses.
    const re = /(?<!\\)\(\?<([A-Za-z_$][\w$]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pattern)) !== null) {
        if (!names.includes(m[1])) names.push(m[1]);
    }
    return names;
}

export class Regex implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Regex',
        name: 'regex',
        icon: 'file:icon.color.svg',
        defaults: {
            name: 'Regex',
        },
        description: 'Extract named capture groups from a text using a regular expression.',
        group: ['input'],
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        outputNames: ['Groups'],
        properties: [
            {
                displayName: 'Text',
                name: 'haystack',
                type: 'string',
                typeOptions: { rows: 4 },
                default: '',
                placeholder: 'Text to search in',
                description: 'The text the regular expressions are applied to',
            },
            {
                displayName: 'Captures',
                name: 'regex-expressions',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                    sortable: true,
                    minRequiredFields: 1,
                },
                placeholder: 'Add Capture',
                default: { capture: [{ 'group-name': '', expression: '' }] },
                options: [
                    {
                        name: 'capture',
                        displayName: 'Capture',
                        values: [
                            {
                                displayName: 'Group Name',
                                name: 'group-name',
                                type: 'string',
                                default: '',
                                placeholder: 'e.g. year  (or  year, month)',
                                description:
                                    'Name of the group to extract and key of the output field. Separate several with commas. Leave empty to extract every named group in the expression.',
                            },
                            {
                                displayName: 'Expression',
                                name: 'expression',
                                type: 'string',
                                typeOptions: { rows: 2 },
                                default: '',
                                placeholder: 'Date: (?<year>[0-9]{4})-(?<month>[0-9]{2})',
                                description: 'Regular expression, with named groups like (?&lt;name&gt;...). Write it without slashes or flags.',
                                required: true,
                            },
                            {
                                displayName: 'Multi-Match',
                                name: 'multiple',
                                type: 'boolean',
                                default: false,
                                description:
                                    'Whether to return an array with every match instead of only the first one',
                            },
                            {
                                displayName: 'Whole Text',
                                name: 'wholeText',
                                type: 'boolean',
                                default: false,
                                description:
                                    'Whether to apply the expression to the whole text instead of line by line. Needed for matches that span several lines.',
                            },
                        ],
                    },
                ],
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Dot Matches Newline',
                        name: 'dotAll',
                        type: 'boolean',
                        default: false,
                        description:
                            'Whether "." also matches line breaks (flag s). Only useful together with "Whole Text".',
                    },
                    {
                        displayName: 'Ignore Case',
                        name: 'ignoreCase',
                        type: 'boolean',
                        default: true,
                        description: 'Whether the match is case-insensitive (flag i)',
                    },
                    {
                        displayName: 'Keep Input Fields',
                        name: 'keepInput',
                        type: 'boolean',
                        default: false,
                        description:
                            'Whether to keep the fields of the incoming item next to the extracted groups',
                    },
                    {
                        displayName: 'Unicode Mode',
                        name: 'unicode',
                        type: 'boolean',
                        default: false,
                        description:
                            'Whether to enable strict Unicode mode (flag u). Needed for \\p{L} style classes, but makes some escapes like \\- invalid.',
                    },
                ],
            },
        ],
        version: [1],
        usableAsTool: true,
    };

    async execute(this: IExecuteFunctions): Promise<NodeOutput> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const haystack = String(this.getNodeParameter('haystack', itemIndex, '') ?? '');
                const captures =
                    (
                        this.getNodeParameter('regex-expressions', itemIndex, {}) as {
                            capture?: Capture[];
                        }
                    ).capture ?? [];
                const options = this.getNodeParameter('options', itemIndex, {}) as Options;

                if (captures.length === 0) {
                    throw new NodeOperationError(this.getNode(), 'Add at least one capture', {
                        itemIndex,
                    });
                }

                const extracted: { [key: string]: Value } = {};

                for (const capture of captures) {
                    const result = extract(
                        haystack,
                        capture,
                        options,
                        (msg) =>
                            new NodeOperationError(this.getNode(), msg, { itemIndex }),
                    );
                    Object.assign(extracted, result);
                }

                returnData.push({
                    json: options.keepInput
                        ? { ...items[itemIndex].json, ...(extracted as IDataObject) }
                        : (extracted as IDataObject),
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}

function extract(
    haystack: string,
    capture: Capture,
    options: Options,
    fail: (message: string) => Error,
): { [key: string]: Value } {
    const pattern = capture.expression ?? '';
    if (pattern === '') throw fail('The expression is empty');

    const multi = capture.multiple ?? false;
    const wholeText = capture.wholeText ?? false;

    const flags =
        'gm' +
        ((options.ignoreCase ?? true) ? 'i' : '') +
        (options.unicode ? 'u' : '') +
        (options.dotAll ? 's' : '');

    let regex: RegExp;
    try {
        regex = new RegExp(pattern, flags);
    } catch (e) {
        throw fail((e as Error).message);
    }

    const declared = namedGroupsOf(pattern);
    const requested = (capture['group-name'] ?? '')
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g !== '');

    // Which output key reads which group (undefined = positional fallback, see below).
    let names = requested;
    if (names.length === 0) {
        if (declared.length === 0) {
            throw fail(
                'Fill in "Group Name" or use named groups like (?<name>...) in the expression',
            );
        }
        names = declared;
    }

    if (declared.length > 0) {
        const unknown = names.filter((n) => !declared.includes(n));
        if (unknown.length > 0) {
            throw fail(
                `Group "${unknown.join('", "')}" does not exist in the expression. Available groups: ${declared.join(', ')}`,
            );
        }
    }

    // Collect every match, line by line or over the whole text.
    const segments = wholeText ? [haystack] : haystack.split(/\r?\n/);
    const matches: RegExpMatchArray[] = [];
    for (const segment of segments) {
        for (const m of segment.matchAll(regex)) {
            matches.push(m);
            if (!multi) break;
        }
        if (!multi && matches.length > 0) break;
    }

    const out: { [key: string]: Value } = {};
    for (const name of names) {
        // Named group if declared; otherwise (no named groups in the regex) the name is just
        // a label for capture group 1, or for the whole match when there are no groups.
        const read = (m: RegExpMatchArray): string | undefined =>
            declared.length > 0 ? m.groups?.[name] : m.length > 1 ? m[1] : m[0];

        const values = matches.map(read).filter((v): v is string => v !== undefined);
        out[name] = multi ? values : (values[0] ?? null);
    }
    return out;
}
