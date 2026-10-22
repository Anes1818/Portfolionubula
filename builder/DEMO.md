# Nebula demo

Public entry: /builder/ (preserves recipe queries and saved design hashes).
Current runtime: /demo/nebula-builder/.

Rebuild in this order:

    node builder/tools/build-shop.cjs
    node builder/tools/build-demo.cjs

The demo imports the tested La Flor Eterna runtime and artwork with its own
Nebula identity, sample pricing, request recipient, and scoped browser storage.
It does not load the client's Firebase configuration or write customer records.
Requests are clearly labeled as demonstrations and go to the configured Nebula
number. The La Flor Eterna storefront keeps its own identity and live database.

Edit source files in builder/ and clients/la-flor-eterna/, or the demo adapter
in tools/build-demo.cjs. Do not hand-edit generated demo runtime files.
Generated files and their manifest must be committed with unchanged line endings.
Test: node builder/tests/nebula-demo.cjs from repository root (preview port 4175).
