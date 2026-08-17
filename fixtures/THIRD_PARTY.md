# Third-party fixtures

Wave 1 C2PA fixtures under `fixtures/c2pa/` are synthetic. They are hand-built
PNG `tEXt` and JPEG APP11 bytes that contain the ASCII string `c2pa`. They are
not copies of watermarks-remover (WR) MIT fixtures and are not signed Claude
Outputs.

They prove parser and strip behavior only. They do not prove Anthropic's key
or an official detector result.

No WR fixture bytes are copied into this tree. `NOTICE` already records the
WR MIT study credit; it is unchanged for these synthetic files.
