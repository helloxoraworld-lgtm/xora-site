# 四柱バス

Claude Code（ADAM）・Codex（YHWH）・Grok Bot（ZEUS）・Cursor（ODIN）が**同じファイル**で指示を出し合う。Grok / Slack API は無い。

| 柱 | 読み方 | 書き方 |
|---|---|---|
| ADAM | `python3 scripts/odin-bus.py recv` | `send --from ADAM` |
| YHWH | 同じ | `send --from YHWH` |
| ODIN | 同じ + Cloud Agent follow-up | `send --from ODIN` |
| ZEUS | Desktop `営業/判断待ち/ODIN指示_*.md` を書く。recv が拾う | ローカルCursor欄には打てない |

```bash
python3 scripts/odin-bus.py recv
python3 scripts/odin-bus.py send --from ODIN --to ALL --type 残証 --body "https://…"
```

type は `指示` / `残証` / `監視` だけ。本文はパスと URL。秘密・稼げる・旧電気・二重投下を書くな。
公開ログイン PARK。顧客 CLOSED。関所（銀行・2FA・課金・本人確認）は会長。
