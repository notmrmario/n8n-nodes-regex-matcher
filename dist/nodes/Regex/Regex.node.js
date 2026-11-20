"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Regex = void 0;
const n8n_workflow_1 = require("n8n-workflow");
function namedGroupsOf(pattern) {
    const names = [];
    const re = /(?<!\\)\(\?<([A-Za-z_$][\w$]*)>/g;
    let m;
    while ((m = re.exec(pattern)) !== null) {
        if (!names.includes(m[1]))
            names.push(m[1]);
    }
    return names;
}
class Regex {
    constructor() {
        this.description = {
            displayName: 'Regex',
            name: 'regex',
            icon: 'file:icon.color.svg',
            defaults: {
                name: 'Regex',
            },
            description: 'Extract named capture groups from a text using a regular expression.',
            group: ['input'],
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
                                    description: 'Name of the group to extract and key of the output field. Separate several with commas. Leave empty to extract every named group in the expression.',
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
                                    description: 'Whether to return an array with every match instead of only the first one',
                                },
                                {
                                    displayName: 'Whole Text',
                                    name: 'wholeText',
                                    type: 'boolean',
                                    default: false,
                                    description: 'Whether to apply the expression to the whole text instead of line by line. Needed for matches that span several lines.',
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
                            description: 'Whether "." also matches line breaks (flag s). Only useful together with "Whole Text".',
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
                            description: 'Whether to keep the fields of the incoming item next to the extracted groups',
                        },
                        {
                            displayName: 'Unicode Mode',
                            name: 'unicode',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to enable strict Unicode mode (flag u). Needed for \\p{L} style classes, but makes some escapes like \\- invalid.',
                        },
                    ],
                },
            ],
            version: [1],
            usableAsTool: true,
        };
    }
    async execute() {
        var _a, _b;
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const haystack = String((_a = this.getNodeParameter('haystack', itemIndex, '')) !== null && _a !== void 0 ? _a : '');
                const captures = (_b = this.getNodeParameter('regex-expressions', itemIndex, {}).capture) !== null && _b !== void 0 ? _b : [];
                const options = this.getNodeParameter('options', itemIndex, {});
                if (captures.length === 0) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Add at least one capture', {
                        itemIndex,
                    });
                }
                const extracted = {};
                for (const capture of captures) {
                    const result = extract(haystack, capture, options, (msg) => new n8n_workflow_1.NodeOperationError(this.getNode(), msg, { itemIndex }));
                    Object.assign(extracted, result);
                }
                returnData.push({
                    json: options.keepInput
                        ? { ...items[itemIndex].json, ...extracted }
                        : extracted,
                    pairedItem: { item: itemIndex },
                });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
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
exports.Regex = Regex;
function extract(haystack, capture, options, fail) {
    var _a, _b, _c, _d, _e, _f;
    const pattern = (_a = capture.expression) !== null && _a !== void 0 ? _a : '';
    if (pattern === '')
        throw fail('The expression is empty');
    const multi = (_b = capture.multiple) !== null && _b !== void 0 ? _b : false;
    const wholeText = (_c = capture.wholeText) !== null && _c !== void 0 ? _c : false;
    const flags = 'gm' +
        (((_d = options.ignoreCase) !== null && _d !== void 0 ? _d : true) ? 'i' : '') +
        (options.unicode ? 'u' : '') +
        (options.dotAll ? 's' : '');
    let regex;
    try {
        regex = new RegExp(pattern, flags);
    }
    catch (e) {
        throw fail(e.message);
    }
    const declared = namedGroupsOf(pattern);
    const requested = ((_e = capture['group-name']) !== null && _e !== void 0 ? _e : '')
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g !== '');
    let names = requested;
    if (names.length === 0) {
        if (declared.length === 0) {
            throw fail('Fill in "Group Name" or use named groups like (?<name>...) in the expression');
        }
        names = declared;
    }
    if (declared.length > 0) {
        const unknown = names.filter((n) => !declared.includes(n));
        if (unknown.length > 0) {
            throw fail(`Group "${unknown.join('", "')}" does not exist in the expression. Available groups: ${declared.join(', ')}`);
        }
    }
    const segments = wholeText ? [haystack] : haystack.split(/\r?\n/);
    const matches = [];
    for (const segment of segments) {
        for (const m of segment.matchAll(regex)) {
            matches.push(m);
            if (!multi)
                break;
        }
        if (!multi && matches.length > 0)
            break;
    }
    const out = {};
    for (const name of names) {
        const read = (m) => { var _a; return declared.length > 0 ? (_a = m.groups) === null || _a === void 0 ? void 0 : _a[name] : m.length > 1 ? m[1] : m[0]; };
        const values = matches.map(read).filter((v) => v !== undefined);
        out[name] = multi ? values : ((_f = values[0]) !== null && _f !== void 0 ? _f : null);
    }
    return out;
}
//# sourceMappingURL=Regex.node.js.map