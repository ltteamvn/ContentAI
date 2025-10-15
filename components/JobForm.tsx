
import React, { useState } from 'react';

interface JobFormProps {
  onAddJob: (jobData: { title: string; videoCode: string; youtubeLink?: string }) => void;
}

export const JobForm: React.FC<JobFormProps> = ({ onAddJob }) => {
  const [title, setTitle] = useState('');
  const [videoCode, setVideoCode] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoCode.trim()) {
      setError('Tiêu đề và Mã video là bắt buộc.');
      return;
    }
    setError('');
    onAddJob({ title, videoCode, youtubeLink });
    setTitle('');
    setVideoCode('');
    setYoutubeLink('');
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl shadow-2xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">Thêm Video Mới</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">
              Tiêu đề Video
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Top 10 sự thật thú vị về vũ trụ"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="videoCode" className="block text-sm font-medium text-slate-300 mb-1">
              Mã Video
            </label>
            <input
              type="text"
              id="videoCode"
              value={videoCode}
              onChange={(e) => setVideoCode(e.target.value)}
              placeholder="VD: 01_ABST_Tap1"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
        </div>
        <div>
            <label htmlFor="youtubeLink" className="block text-sm font-medium text-slate-300 mb-1">
              Link YouTube tham khảo (tùy chọn)
            </label>
            <input
              type="text"
              id="youtubeLink"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="Dán link YouTube vào đây"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end pt-2">
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Thêm vào danh sách
            </button>
        </div>
      </form>
    </div>
  );
};
