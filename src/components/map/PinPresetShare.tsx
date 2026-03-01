import { useState } from 'react';
import { encodePinPreset, buildPinPresetUrl } from '../../lib/pinPreset';
import type { MapPinRow } from '../../db/types';
import { useT } from '../../i18n';
import styles from './PinPresetShare.module.css';

interface PinPresetShareProps {
  pins: MapPinRow[];
}

export function PinPresetShare({ pins }: PinPresetShareProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!name.trim() || pins.length === 0) return;
    const encoded = encodePinPreset(name.trim(), pins);
    const url = buildPinPresetUrl(encoded);
    setGeneratedUrl(url);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
      const textarea = document.createElement('textarea');
      textarea.value = generatedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (pins.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.pin_preset_name_placeholder}
          maxLength={30}
        />
        <button
          className={styles.btn}
          onClick={handleGenerate}
          disabled={!name.trim()}
        >
          {t.pin_preset_generate}
        </button>
      </div>
      {generatedUrl && (
        <div className={styles.urlRow}>
          <input
            type="text"
            className={styles.urlInput}
            value={generatedUrl}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? t.pin_preset_copied : t.pin_preset_copy}
          </button>
        </div>
      )}
    </div>
  );
}
