# n8n-nodes-regex-matcher

This is an n8n community node. It lets you easily match several RegEx expressions across a multi-line string,
allowing for a single or multiple matches of the same regex.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Usage

Add a **Capture** and fill in two fields:

| Field | Example |
|---|---|
| **Group Name** | `year` |
| **Expression** | `Date: (?<year>[0-9]{4})-(?<month>[0-9]{2})` |

The node returns `{ "year": "2026" }`.

- Several groups: `year, month` -> `{ "year": "2026", "month": "11" }`.
- Group Name empty: every named group of the expression is extracted.
- **Multi-Match**: returns an array with every match.
- Expression without named groups: Group Name is just the output key and the value is capture group 1 (or the whole match if there are no groups).
- A group that does not match is returned as `null` (`[]` with Multi-Match).
- Write the expression without slashes or flags; use *Options* for case, unicode and dot-all.

## Compatibility

Tested on n8n v`2.14.2`.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)