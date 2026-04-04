"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Regex = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class Regex {
    constructor() {
        this.description = {
            displayName: "Regex",
            name: "regex",
            icon: "file:icon.color.svg",
            defaults: {
                name: "Regex"
            },
            description: "A node that takes regular expression groups and outputs them as JSON.",
            group: ["input"],
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
    }
    async execute() {
        const haystack = this.getNodeParameter("haystack", 0);
        const expressions = this.getNodeParameter("regex-expressions", 0).capture;
        const groupMatches = {};
        for (const expr of expressions) {
            const multi = expr.multiple;
            const group = expr['group-name'];
            const regex = new RegExp(expr.expression, multi ? "giu" : "iu");
            for (const line of haystack.split("\n").filter(l => l.trim() !== "")) {
                const matches = line.match(regex);
                if (!matches)
                    continue;
                if (multi) {
                    if (!groupMatches[group])
                        groupMatches[group] = [];
                    if (matches.groups && matches.groups[group])
                        groupMatches[group].push(matches.groups[group]);
                    else
                        groupMatches[group].push(...matches);
                }
                else {
                    if (matches.groups && matches.groups[group])
                        groupMatches[group] = matches.groups[group];
                    else
                        groupMatches[group] = matches[0];
                }
            }
        }
        return [[{ json: { ...groupMatches } }]];
    }
}
exports.Regex = Regex;
//# sourceMappingURL=Regex.node.js.map