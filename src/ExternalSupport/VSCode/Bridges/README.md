# Bridges

Owns glue between VSCode surfaces, such as editor-to-preview reveal coordination and message contracts.

Keep bridge state explicit and small so command handlers and providers do not share hidden globals.
