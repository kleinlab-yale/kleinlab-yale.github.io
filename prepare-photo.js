(() => {
  const input = document.getElementById('photo');
  const status = document.getElementById('status');
  const error = document.getElementById('error');
  const result = document.getElementById('result');
  const preview = document.getElementById('preview');
  const download = document.getElementById('download');
  let outputUrl;
  let sequence = 0;
  const formatSize = size => `${(size / 1000000).toFixed(2)} MB`;
  const decode = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This browser could not open the photo. Try a JPEG, PNG, or WebP copy.'));
    image.src = url;
  });
  const encode = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The smaller image could not be created. Please try another photo.')), 'image/jpeg', quality);
  });
  input.addEventListener('change', async () => {
    const current = ++sequence;
    const file = input.files[0];
    result.hidden = true;
    error.hidden = true;
    if (outputUrl) { URL.revokeObjectURL(outputUrl); outputUrl = null; }
    if (!file) { status.textContent = 'Choose a photo to get started.'; return; }
    status.textContent = 'Preparing your photo…';
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = await decode(sourceUrl);
      if (current !== sequence) return;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image preparation is not available in this browser. Try Safari or Chrome.');
      let scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      let blob;
      for (let attempt = 0; attempt < 8; attempt++) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        blob = await encode(canvas, 0.82);
        if (blob.size <= 1800000) break;
        scale *= 0.75;
      }
      if (current !== sequence) return;
      if (!blob || blob.size > 1800000) throw new Error('This photo could not be made small enough. Try another photo.');
      outputUrl = URL.createObjectURL(blob);
      preview.src = outputUrl;
      download.href = outputUrl;
      download.download = `${file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'lab-photo'}-web.jpg`;
      document.getElementById('sizes').textContent = `${formatSize(file.size)} → ${formatSize(blob.size)} · ${canvas.width} × ${canvas.height} pixels`;
      result.hidden = false;
      status.textContent = 'Ready. Save the smaller JPEG below, then upload it in the editor.';
    } catch (failure) {
      if (current !== sequence) return;
      status.textContent = 'Photo preparation was not completed.';
      error.textContent = failure.message || 'Please try a different photo.';
      error.hidden = false;
    } finally { URL.revokeObjectURL(sourceUrl); }
  });
})();
