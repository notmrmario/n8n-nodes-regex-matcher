import type {
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
    NodeOutput,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Regex implements INodeType {
    description: INodeTypeDescription = {
        displayName: "Regex",
        name: "regex",
        // icon: {
        //     dark: "file:icon.dark.svg",
        //     light: "file:icon.light.svg"
        // },
        icon: "file:icon.color.svg",
        defaults: {
            name: "Regex"
        },
        description: "A node that takes regular expression groups and outputs them as JSON.",
        group: ["input"],
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        outputNames: ["Groups"],
        properties: [
            {
                displayName: "Haystack",
                name: "haystack",
                type: "string",
                default: "",
            },
            {
                displayName: 'RegEx Expressions',
                name: 'regex-expressions',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                    sortable: true,
                    minRequiredFields: 1
                },
                default: {},
                options: [
                    {
                        name: "capture",
                        displayName: "Capture",
                        values: [
                            {
                                displayName: "Group Name",
                                name: "group-name",
                                placeholder: "Group",
                                default: "",
                                type: "string",
                                hint: "Name of the group to match",
                                required: true
                            },
                            {
                                displayName: "Expression",
                                name: "expression",
                                placeholder: "RegEx",
                                default: "",
                                type: "string",
                                hint: "RegEx expression to match",
                                required: true
                            },
                            {
                                displayName: "Multi-Match",
                                name: "multiple",
                                type: "boolean",
                                default: false,
                            }
                        ]
                    }
                ],
            }
        ],
        version: [1],
        usableAsTool: true,
    };

    async execute(this: IExecuteFunctions): Promise<NodeOutput> {
        const haystack = this.getNodeParameter("haystack", 0) as string;
        const expressions = (this.getNodeParameter("regex-expressions", 0) as { capture: Capture[] }).capture;
        const groupMatches: { [key: string]: string[] | string | null; } = {};

        for (const expr of expressions) {
            const multi = expr.multiple;
            const group = expr['group-name'];
            const regex = new RegExp(expr.expression, multi ? "giu" : "iu");

            for (const line of haystack.split("\n").filter(l => l.trim() !== "")) {
                const matches = line.match(regex);
                if (!matches) continue;

                if (multi) {
                    if (!groupMatches[group]) groupMatches[group] = [];
                    if (matches.groups) (groupMatches[group] as string[]).push(matches.groups[group]);
                    else (groupMatches[group] as string[]).push(...matches);
                } else groupMatches[group] = matches[0];
            }
        }

        return [[{ json: { ...groupMatches } }]];
    }
}

type Capture = {
    "group-name": string;
    "expression": string;
    "multiple": boolean;
};