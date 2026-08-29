const photoInput = document.getElementById('photoInput');
const photoLabel = document.getElementById('photoLabel');
const meetingName = document.getElementById('meetingName');
const memo = document.getElementById('memo');
const tone = document.getElementById('tone');
const hashtagCount = document.getElementById('hashtagCount');
const generateBtn = document.getElementById('generateBtn');
const regenBtn = document.getElementById('regenBtn');
const shareBtn = document.getElementById('shareBtn');
const genStatus = document.getElementById('genStatus');
const shareStatus = document.getElementById('shareStatus');
const resultCard = document.getElementById('result');
const captionText = document.getElementById('captionText');

let selectedFile = null;

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  photoLabel.innerHTML = `<img src="${url}" alt="選択した写真">`;
});

async function generateCaption() {
  const name = meetingName.value.trim();
  if (!name) {
    genStatus.textContent = '会議名を入力してください。';
    genStatus.className = 'status error';
    meetingName.focus();
    return;
  }

  generateBtn.disabled = true;
  regenBtn.disabled = true;
  genStatus.textContent = '';
  generateBtn.innerHTML = '<span class="spinner"></span>生成中...';

  try {
    const res = await fetch('/api/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingName: name,
        memo: memo.value,
        tone: tone.value,
        hashtagCount: hashtagCount.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '生成に失敗しました。');
    }

    captionText.textContent = data.caption;
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    genStatus.textContent = '';
  } catch (err) {
    genStatus.textContent = err.message || 'エラーが発生しました。';
    genStatus.className = 'status error';
  } finally {
    generateBtn.disabled = false;
    regenBtn.disabled = false;
    generateBtn.textContent = '投稿文を生成する';
  }
}

generateBtn.addEventListener('click', generateCaption);
regenBtn.addEventListener('click', generateCaption);

shareBtn.addEventListener('click', async () => {
  const text = captionText.textContent.trim();
  shareStatus.textContent = '';

  if (!text) {
    shareStatus.textContent = '投稿文がありません。';
    shareStatus.className = 'status error';
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
  }

  try {
    if (selectedFile && navigator.canShare && navigator.canShare({ files: [selectedFile] })) {
      await navigator.share({
        files: [selectedFile],
        title: '川西町 投稿',
        text: text
      });
      shareStatus.textContent = '文章をコピーしました。共有先でキャプション欄に貼り付けてください。';
      shareStatus.className = 'status ok';
    } else if (navigator.share) {
      await navigator.share({ title: '川西町 投稿', text: text });
      shareStatus.textContent = '文章を共有しました。';
      shareStatus.className = 'status ok';
    } else {
      shareStatus.textContent = 'この端末は共有機能に対応していません。文章はコピー済みです。Instagramアプリに直接貼り付けてください。';
      shareStatus.className = 'status ok';
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      shareStatus.textContent = '文章はコピー済みです。Instagramアプリを開いて貼り付けてください。';
      shareStatus.className = 'status ok';
    }
  }
});
