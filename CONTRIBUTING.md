# Contributing

Thanks for considering a contribution to `node-red-contrib-network-tools`.

## Getting set up

```bash
git clone https://github.com/CervezaStallone/node-red-contrib-brdc-network-tools.git
cd node-red-contrib-brdc-network-tools
npm install
npm test
```

## Making changes

- Each node is a self-contained `<name>.js` + `<name>.html` pair. Follow the existing convention: `RED.nodes.createNode`, `node.status()` feedback, two outputs (success/failure), `msg.*` overriding node config, and a `node.on('close', ...)` cleanup handler.
- Add or update a matching `test/<name>_spec.js` for any behavior change — this project uses `node-red-node-test-helper` + `mocha` + `should`, and prefers real network calls over mocks except where the existing suite already stubs a library directly (e.g. `sinon`-stubbing `ping`).
- Run `npm test` before opening a PR. All tests must pass.
- Keep node categories under `brdc-network-nodes` and pick a distinct palette color from the existing nodes.

## Reporting bugs / requesting features

Open an issue at [GitHub Issues](https://github.com/CervezaStallone/node-red-contrib-brdc-network-tools/issues) with:
- What you expected vs. what happened
- Node-RED and Node.js versions
- A minimal flow/config that reproduces the problem, if applicable

## Pull requests

- Keep PRs focused — one node or one fix per PR is easiest to review.
- Update `README.md`'s Available Nodes and Version History sections if you add or change a node.
- By submitting a PR, you agree your contribution is licensed under this project's [GPL-3.0 license](LICENSE).
