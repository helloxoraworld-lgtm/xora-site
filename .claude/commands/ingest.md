# /ingest

ZEUS指示を読む。Grok直通ではない。

1. Run `python3 scripts/odin-ingest.py`
2. Read any `ODIN指示_*.md` hit
3. Also treat this Cloud Agent thread’s follow-up as ZEUS reply
4. Desktop 正本が無いファイルは FAIL。新正本を作るな
5. 結果は残証パスと URL だけ
