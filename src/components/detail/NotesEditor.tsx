import { useState, useEffect, useRef, useCallback } from 'react';
import { getNote, upsertNote } from '../../db/operations';
import styles from './NotesEditor.module.css';

interface NotesEditorProps {
  taskId: string;
}

export function NotesEditor({ taskId }: NotesEditorProps) {
  const [text, setText] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fadeRef = useRef<ReturnType<typeof setTimeout>>();

  // マウント時 / taskId変更時にメモを読み込み
  useEffect(() => {
    let cancelled = false;
    getNote(taskId).then((note) => {
      if (!cancelled) setText(note?.text ?? '');
    });
    return () => { cancelled = true; };
  }, [taskId]);

  const save = useCallback(
    async (value: string) => {
      await upsertNote(taskId, value);
      setShowSaved(true);
      if (fadeRef.current) clearTimeout(fadeRef.current);
      fadeRef.current = setTimeout(() => setShowSaved(false), 1500);
    },
    [taskId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(value), 500);
  };

  // タイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={handleChange}
        placeholder="メモを入力..."
      />
      <span className={styles.saved} data-visible={showSaved || undefined}>
        保存済み
      </span>
    </div>
  );
}
