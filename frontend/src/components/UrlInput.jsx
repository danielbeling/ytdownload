import { useState } from 'react';
import { MdFlashOn, MdClose } from 'react-icons/md';


export default function UrlInput({ onConvert, loading }) {
    const [value, setValue] = useState('');

    const handleConvert = () => {
        if (!value.trim()) return;
        onConvert(value);
        setValue('');
    };

    const handleKeyDown = (e) => {
        // Cmd/Ctrl+Enter to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleConvert();
        }
    };

    const lineCount = value.split('\n').filter(l => l.trim()).length;

    return (
        <div>
            <div className="url-input-label">
                <span className="dot" />
                URLs dos vídeos
            </div>
            <textarea
                id="url-input"
                className="url-textarea"
                placeholder={`Cole as URLs aqui — uma por linha:\nhttps://youtube.com/watch?v=...\nhttps://youtube.com/watch?v=...`}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoFocus
            />
            <div className="url-hint">
                {lineCount > 0
                    ? `${lineCount} URL${lineCount > 1 ? 's' : ''} detectada${lineCount > 1 ? 's' : ''} • Ctrl+Enter para converter`
                    : 'Cole uma ou mais URLs do YouTube (máx. 20)'}
            </div>
            <div className="btn-row">
                <button
                    id="convert-btn"
                    className="btn btn-primary"
                    onClick={handleConvert}
                    disabled={loading || !value.trim()}
                >
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <MdFlashOn size={18} /> Converter {lineCount > 1 ? `${lineCount} vídeos` : lineCount === 1 ? '1 vídeo' : ''}
                        </>
                    )}
                </button>
                {value.trim() && (
                    <button
                        className="btn btn-ghost"
                        onClick={() => setValue('')}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        <MdClose size={18} /> Limpar
                    </button>
                )}
            </div>
        </div>
    );
}
