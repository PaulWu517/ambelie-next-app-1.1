'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../VirtualTryOn.module.css';

interface ParamGroup {
  name: string;
  temperature: number;
  topP: number;
  topK: number;
  seedBase?: number; // 每组基础种子，实际请求 seed = seedBase + runIndex
}

interface RunResult {
  status: 'idle' | 'running' | 'done' | 'error';
  imageUrl?: string; // data URL
  mimeType?: string;
  durationMs?: number;
  error?: string;
}

// 统一初始化矩阵，显式返回类型为 RunResult[][]，避免被推断为 {status:'idle'}
const initResults: () => RunResult[][] = () => Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => ({ status: 'idle' as const })));

const defaultGroups: ParamGroup[] = [
  { name: 'A', temperature: 0.2, topP: 0.98, topK: 20, seedBase: 1000 },
  { name: 'B', temperature: 0.1, topP: 0.90, topK: 40, seedBase: 2000 },
  { name: 'C', temperature: 0.3, topP: 0.95, topK: 30, seedBase: 3000 },
  { name: 'D', temperature: 0.5, topP: 0.98, topK: 20, seedBase: 4000 },
];

const SweepPage: React.FC = () => {
  // 隐藏全局头部，聚焦测试页面
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
    return () => { if (header) header.style.display = ''; };
  }, []);

  // Removed useSearchParams to avoid CSR bailout during prerender

  const [userImage, setUserImage] = useState<string | null>(null); // data URL
  const [refImage, setRefImage] = useState<string | null>(null);   // data URL 或远程 URL
  const [prompt, setPrompt] = useState<string>('Return only one edited photo. Keep background, pose, and face unchanged.');
  const [groups, setGroups] = useState<ParamGroup[]>(defaultGroups);
  const [results, setResults] = useState<RunResult[][]>(initResults());
  const [running, setRunning] = useState(false);

  const userInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [isUserDragActive, setIsUserDragActive] = useState(false);
  const [isRefDragActive, setIsRefDragActive] = useState(false);

  // 移除了查询参数自动填充参考图的逻辑，必须通过上传选择产品图


  const handleUserUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUserImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleUserDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setIsUserDragActive(true); };
  const handleUserDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsUserDragActive(true); };
  const handleUserDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsUserDragActive(false); };
  const handleUserDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) { setIsUserDragActive(false); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setUserImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIsUserDragActive(false);
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRefImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleRefDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setIsRefDragActive(true); };
  const handleRefDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsRefDragActive(true); };
  const handleRefDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsRefDragActive(false); };
  const handleRefDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) { setIsRefDragActive(false); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setRefImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIsRefDragActive(false);
  };

  const canRun = useMemo(() => !!userImage && !!refImage, [userImage, refImage]);

  const toBlob = async (urlOrDataUrl: string): Promise<Blob> => {
    const res = await fetch(urlOrDataUrl);
    return await res.blob();
  };

  const callTryOn = async (g: ParamGroup, runIndex: number): Promise<RunResult> => {
    const started = Date.now();
    try {
      if (!userImage || !refImage) throw new Error('Missing images');
      const userBlob = await toBlob(userImage);
      const refBlob = await toBlob(refImage);
      const formData = new FormData();
      formData.append('user_image', new File([userBlob], 'user.jpg', { type: userBlob.type || 'image/jpeg' }));
      formData.append('model_image', new File([refBlob], 'ref.jpg', { type: refBlob.type || 'image/jpeg' }));
      formData.append('measurements', JSON.stringify(null));
      formData.append('prompt', prompt);
      formData.append('temperature', String(g.temperature));
      formData.append('topP', String(g.topP));
      formData.append('topK', String(g.topK));
      if (typeof g.seedBase === 'number') formData.append('seed', String(g.seedBase + runIndex));

      const resp = await fetch('/api/virtual-tryon', { method: 'POST', body: formData });
      if (!resp.ok) {
        let detail: any = null;
        try { detail = await resp.json(); } catch { detail = await resp.text(); }
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      const json = await resp.json();
      const mime = json?.mimeType || 'image/png';
      const url = `data:${mime};base64,${json?.imageBase64}`;
      return { status: 'done', imageUrl: url, mimeType: mime, durationMs: Date.now() - started };
    } catch (e: any) {
      return { status: 'error', error: e?.message || String(e), durationMs: Date.now() - started };
    }
  };

  const runSweep = async () => {
    if (!canRun || running) return;
    setRunning(true);
    // 清空旧结果
    setResults(initResults());

    // 逐组顺序执行，组内串行（避免过大并发导致限流）
    const next: RunResult[][] = initResults();
    for (let gi = 0; gi < 4; gi++) {
      for (let ri = 0; ri < 5; ri++) {
        // 标记 running
        next[gi][ri] = { status: 'running' };
        setResults(JSON.parse(JSON.stringify(next)) as RunResult[][]);
        const res = await callTryOn(groups[gi], ri);
        next[gi][ri] = res;
        setResults(JSON.parse(JSON.stringify(next)) as RunResult[][]);
      }
    }

    setRunning(false);
  };

  const updateGroup = (gi: number, patch: Partial<ParamGroup>) => {
    setGroups(prev => prev.map((g, i) => i === gi ? { ...g, ...patch } : g));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Virtual Try-On · Parameter Sweep</h1>
        <p className={styles.subtitle}>Test 4 parameter groups, 5 runs each, to compare stability and quality.</p>
      </div>

      <div className={styles.mainContent} style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* 左侧：图片与提示词设置 */}
        <div className={styles.leftPanel}>
          <h2 className={styles.sectionTitle}>Inputs</h2>
          <div className={styles.uploadSection}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem' }}>Upload Person Photo</h3>
            <div
              className={`${styles.uploadArea} ${isUserDragActive ? styles.uploadAreaDragActive : ''}`}
              onClick={() => userInputRef.current?.click()}
              onDragOver={handleUserDragOver}
              onDragEnter={handleUserDragEnter}
              onDragLeave={handleUserDragLeave}
              onDrop={handleUserDrop}
            >
              {userImage ? (
                <img src={userImage} alt="User" className={styles.uploadedImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <div className={styles.uploadIcon}>📷</div>
                  <p>Click or drag to upload your full-body photo</p>
                  <span className={styles.uploadHint}>Recommended: Front-facing, good lighting</span>
                </div>
              )}
            </div>
            <input ref={userInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleUserUpload} />
          </div>

          <div className={styles.uploadSection}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem' }}>Upload Reference Outfit</h3>
            <div
              className={`${styles.uploadArea} ${isRefDragActive ? styles.uploadAreaDragActive : ''}`}
              onClick={() => refInputRef.current?.click()}
              onDragOver={handleRefDragOver}
              onDragEnter={handleRefDragEnter}
              onDragLeave={handleRefDragLeave}
              onDrop={handleRefDrop}
            >
              {refImage ? (
                typeof refImage === 'string' && refImage.startsWith('http') ? (
                  <img src={refImage} alt="Reference" className={styles.uploadedImage} />
                ) : (
                  <img src={refImage} alt="Reference" className={styles.uploadedImage} />
                )
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <div className={styles.uploadIcon}>🧥</div>
                  <p>Click or drag to upload a clothing reference photo</p>
                  {/* hint removed */}
                </div>
              )}
            </div>
            <input ref={refInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleRefUpload} />
          </div>

          <div className={styles.uploadSection}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem' }}>Extra Prompt</h3>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
          </div>

          <button onClick={runSweep} disabled={!canRun || running} style={{ padding: '12px 16px', borderRadius: 8, border: 'none', background: canRun && !running ? '#111827' : '#aaa', color: '#fff', cursor: canRun && !running ? 'pointer' : 'not-allowed' }}>
            {running ? 'Running…' : 'Run 4×5 Sweep'}
          </button>
        </div>

        {/* 中间：参数组配置 */}
        <div className={styles.centerPanel}>
          <h2 className={styles.sectionTitle}>Parameter Groups</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {groups.map((g, gi) => (
              <div key={gi} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong>Group {g.name}</strong>
                  <span style={{ color: '#999' }}>seed base: {g.seedBase ?? 'none'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 90 }}>temperature</span>
                    <input type="number" step="0.05" min={0} max={2} value={g.temperature} onChange={(e) => updateGroup(gi, { temperature: parseFloat(e.target.value) })} style={{ flex: 1, padding: 6, border: '1px solid #ddd', borderRadius: 6 }} />
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 90 }}>topP</span>
                    <input type="number" step="0.01" min={0} max={1} value={g.topP} onChange={(e) => updateGroup(gi, { topP: parseFloat(e.target.value) })} style={{ flex: 1, padding: 6, border: '1px solid #ddd', borderRadius: 6 }} />
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 90 }}>topK</span>
                    <input type="number" step="1" min={1} max={50} value={g.topK} onChange={(e) => updateGroup(gi, { topK: parseInt(e.target.value) })} style={{ flex: 1, padding: 6, border: '1px solid #ddd', borderRadius: 6 }} />
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 90 }}>seed base</span>
                    <input type="number" step="1" value={g.seedBase ?? ''} onChange={(e) => updateGroup(gi, { seedBase: e.target.value === '' ? undefined : parseInt(e.target.value) })} style={{ flex: 1, padding: 6, border: '1px solid #ddd', borderRadius: 6 }} />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* 将结果放在参数分组下方（已移至中间面板下方，右侧隐藏避免重复） */}
          <div style={{ marginTop: 24 }}>
            <h2 className={styles.sectionTitle}>Results (4 groups × 5 runs)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {results.map((row, gi) => (
                <React.Fragment key={gi}>
                  {row.map((cell, ri) => (
                    <div key={`${gi}-${ri}`} style={{ border: '1px solid #eee', borderRadius: 12, padding: 8, background: '#fff', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <div style={{ fontSize: 12, color: '#555' }}>G{groups[gi].name} · R{ri + 1}</div>
                      {cell.status === 'running' && (
                        <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>Processing…</div>
                      )}
                      {cell.status === 'error' && (
                        <div style={{ color: '#b91c1c', fontSize: 12, textAlign: 'center' }}>{cell.error}</div>
                      )}
                      {cell.status === 'done' && cell.imageUrl && (
                        <img src={cell.imageUrl} alt={`G${groups[gi].name}-R${ri + 1}`} style={{ width: '100%', borderRadius: 8 }} />
                      )}
                      <div style={{ fontSize: 11, color: '#999' }}>{typeof cell.durationMs === 'number' ? `${cell.durationMs}ms` : ''}</div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SweepPage;