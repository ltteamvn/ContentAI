
import React, { useState, useRef, useEffect } from 'react';
import type { Job } from '../types';
import { JobStatus } from '../types';
import { PlayIcon, TrashIcon, ChevronDownIcon, DocumentTextIcon, TagIcon, FilmIcon, PhotographIcon } from './icons/Icons';

interface JobTableProps {
  jobs: Job[];
  onRunJob: (jobId: string) => void;
  onRunAll: () => void;
  onDeleteJob: (jobId: string) => void;
  onDeleteAll: () => void;
  onDownload: (job: Job, fileType: 'content' | 'sale' | 'videoPrompt' | 'thumbnail') => void;
}

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const baseClasses = 'px-3 py-1 text-xs font-semibold rounded-full';
  const statusClasses = {
    [JobStatus.WAITING]: 'bg-slate-500 text-slate-100',
    [JobStatus.PROCESSING]: 'bg-blue-500 text-white animate-pulse',
    [JobStatus.COMPLETED]: 'bg-green-500 text-white',
    [JobStatus.ERROR]: 'bg-red-500 text-white',
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
    const percentage = Math.round(progress * 100);
    return (
        <div className="w-full bg-slate-700 rounded-full h-2">
            <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const ActionButtons: React.FC<{ job: Job; onRunJob: (id: string) => void; onDeleteJob: (id: string) => void; onDownload: JobTableProps['onDownload'] }> = ({ job, onRunJob, onDeleteJob, onDownload }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const DownloadMenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
        <button
            onClick={() => { onClick(); setDropdownOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-3 transition-colors"
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    if (job.status === JobStatus.COMPLETED && job.output) {
        return (
            <div className="flex items-center justify-end gap-2">
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-1 bg-slate-600 px-3 py-2 rounded-md text-sm hover:bg-slate-500 transition-colors"
                    >
                        Tải xuống <ChevronDownIcon />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-52 bg-slate-700 rounded-md shadow-lg z-10 border border-slate-600 overflow-hidden">
                            <DownloadMenuItem icon={<DocumentTextIcon />} label="Kịch bản (.txt)" onClick={() => onDownload(job, 'content')} />
                            <DownloadMenuItem icon={<TagIcon />} label="SEO & Sale (.txt)" onClick={() => onDownload(job, 'sale')} />
                            <DownloadMenuItem icon={<FilmIcon />} label="Prompt Video (.txt)" onClick={() => onDownload(job, 'videoPrompt')} />
                            <DownloadMenuItem icon={<PhotographIcon />} label="Thumbnail (.jpg)" onClick={() => onDownload(job, 'thumbnail')} />
                        </div>
                    )}
                </div>
                <button onClick={() => onDeleteJob(job.id)} title="Xóa" className="p-2 text-red-400 hover:text-red-300 transition-colors"><TrashIcon /></button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <button
                onClick={() => onRunJob(job.id)}
                disabled={job.status === JobStatus.PROCESSING || job.status === JobStatus.COMPLETED}
                title="Chạy"
                className="p-2 text-green-400 hover:text-green-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
                <PlayIcon />
            </button>
            <button
                onClick={() => onDeleteJob(job.id)}
                disabled={job.status === JobStatus.PROCESSING}
                title="Xóa"
                className="p-2 text-red-400 hover:text-red-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
                <TrashIcon />
            </button>
        </div>
    );
};


export const JobTable: React.FC<JobTableProps> = ({ jobs, onRunJob, onRunAll, onDeleteJob, onDeleteAll, onDownload }) => {
  return (
    <div className="bg-slate-800/50 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Danh sách công việc</h2>
            <div className="flex gap-2">
                <button onClick={onRunAll} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2">
                    <PlayIcon /> Chạy tất cả
                </button>
                <button onClick={onDeleteAll} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2">
                    <TrashIcon /> Xóa tất cả
                </button>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                    <tr>
                        <th scope="col" className="px-6 py-3">Mã Video</th>
                        <th scope="col" className="px-6 py-3">Tiêu đề</th>
                        <th scope="col" className="px-6 py-3">Trạng thái</th>
                        <th scope="col" className="px-6 py-3">Tiến độ</th>
                        <th scope="col" className="px-6 py-3 text-right">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.length === 0 && (
                        <tr className="border-b border-slate-700">
                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                                Chưa có công việc nào. Hãy thêm video mới ở trên.
                            </td>
                        </tr>
                    )}
                    {jobs.map((job) => (
                        <tr key={job.id} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 font-mono">{job.videoCode}</td>
                            <td className="px-6 py-4 max-w-xs truncate" title={job.title}>{job.title}</td>
                            <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                            <td className="px-6 py-4 text-slate-400 max-w-sm">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs italic truncate" title={job.status === JobStatus.ERROR ? job.error : job.progressMessage}>
                                        {job.status === JobStatus.ERROR ? <span className="text-red-400 font-semibold">{job.error}</span> : job.progressMessage}
                                    </span>
                                    {(job.status === JobStatus.PROCESSING || (job.status === JobStatus.COMPLETED && job.progress > 0)) && <ProgressBar progress={job.progress} />}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <ActionButtons job={job} onRunJob={onRunJob} onDeleteJob={onDeleteJob} onDownload={onDownload} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
