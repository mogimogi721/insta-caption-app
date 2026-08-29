require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/caption', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'サーバーに ANTHROPIC_API_KEY が設定されていません。'
      });
    }

    const { meetingName, memo, hashtagCount, tone } = req.body || {};

    if (!meetingName || !meetingName.trim()) {
      return res.status(400).json({ error: '会議名を入力してください。' });
    }

    const count = Math.min(Math.max(parseInt(hashtagCount, 10) || 8, 5), 15);
    const toneLabel = tone === 'formal' ? 'ややかしこまった、町の公式広報らしい丁寧な文体' : '親しみやすく温かい、住民に語りかけるような文体';

    const systemPrompt = `あなたは山形県川西町の広報担当者です。町長のInstagram投稿用のキャプションを作成します。
以下のルールに従ってください。

- 出力は日本語のみ。前置きや説明は一切不要で、投稿文とハッシュタグだけを出力する。
- 構成: 1) 本文(3〜5文程度、絵文字を1〜3個ほど自然に使う) 2) 1行空けてハッシュタグの列
- 本文には「何のための会議・協議会なのか」「どんな内容だったか」を、事実を断定しすぎず自然な広報文として盛り込む。ユーザーからメモがあれば必ず反映する。
- 文体は${toneLabel}。
- 川西町、地域振興、まちづくりなどを想起させる内容にする。
- ハッシュタグは${count}個。#川西町 を必ず含め、会議のテーマに関連する日本語ハッシュタグを中心に、一部#地方創生 #まちづくり のような一般的なものも混ぜる。半角スペース区切りで1行にまとめる。
- Markdown記法(**太字**など)は使わない。`;

    const userPrompt = `会議名・案件名: ${meetingName.trim()}
補足メモ(あれば): ${memo && memo.trim() ? memo.trim() : 'なし'}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'AI生成に失敗しました。しばらくして再度お試しください。' });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((c) => c.type === 'text');
    const caption = textBlock ? textBlock.text.trim() : '';

    if (!caption) {
      return res.status(502).json({ error: '生成結果が空でした。もう一度お試しください。' });
    }

    res.json({ caption });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
