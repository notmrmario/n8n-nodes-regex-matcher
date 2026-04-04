import type { IExecuteFunctions, INodeType, INodeTypeDescription, NodeOutput } from 'n8n-workflow';
export declare class Regex implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<NodeOutput>;
}
