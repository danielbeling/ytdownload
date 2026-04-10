import { FaCheckDouble, FaFileArchive } from 'react-icons/fa';

export default function DownloadAllBanner({ doneCount, totalCount, onDownloadAll }) {
    if (doneCount === 0) return null;

    return (
        <div className="download-banner">
            <div className="download-banner-text">
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaCheckDouble /> {doneCount} {doneCount === 1 ? 'arquivo pronto' : 'arquivos prontos'}
                </strong>
                <span>
                    {totalCount > doneCount
                        ? `${totalCount - doneCount} ainda convertendo...`
                        : 'Todos os vídeos foram convertidos!'}
                </span>
            </div>
            <button
                id="download-all-btn"
                className="btn btn-zip"
                onClick={onDownloadAll}
                disabled={doneCount === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
                <FaFileArchive /> Baixar tudo como ZIP
            </button>
        </div>
    );
}
