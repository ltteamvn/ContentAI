
import React, { useState, useRef } from 'react';
import { DocumentArrowUpIcon } from './icons/Icons';

interface JobFormProps {
  onAddJob: (jobData: { title: string; videoCode: string; userScript: string; youtubeLink?: string }) => void;
}

export const JobForm: React.FC<JobFormProps> = ({ onAddJob }) => {
  const [title, setTitle] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/plain') {
        setScriptFile(file);
        // Pre-fill title if empty
        if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
        setError('');
      } else {
        setError('Lỗi: Vui lòng chọn một file kịch bản có định dạng .txt');
        setScriptFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptFile) {
      setError('Vui lòng tải lên file kịch bản (.txt).');
      return;
    }
    if (!title) {
        setError('Vui lòng nhập tiêu đề cho video.');
        return;
    }
    setError('');

    try {
        const userScript = await scriptFile.text();
        const fileName = scriptFile.name.replace(/\.[^/.]+$/, ""); // remove extension for video code
        
        onAddJob({ 
            title, 
            videoCode: fileName, 
            youtubeLink,
            userScript,
        });
        
        setTitle('');
        setYoutubeLink('');
        setScriptFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    } catch(err) {
        setError("Không thể đọc nội dung file. Vui lòng kiểm tra lại file.");
        console.error("Error reading file: ", err);
    }
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl shadow-2xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">Thêm Video Mới</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
             <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">
              Tiêu đề video
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề video tại đây"
              required
              className="mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
           <div>
            <label htmlFor="youtubeLink" className="block text-sm font-medium text-slate-300 mb-1">
              Link YouTube (để lấy thumbnail)
            </label>
            <input
              type="text"
              id="youtubeLink"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="Dán link YouTube vào đây (tùy chọn)"
              className="mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="scriptFile" className="block text-sm font-medium text-slate-300 mb-1">
              File kịch bản (.txt)
            </label>
            <div className="mt-2 flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors ${scriptFile ? 'border-green-500' : ''}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <DocumentArrowUpIcon />
                        {scriptFile ? (
                            <>
                                <p className="mb-2 text-sm text-green-400 font-semibold">{scriptFile.name}</p>
                                <p className="text-xs text-slate-400">Bấm để chọn file khác</p>
                            </>
                        ) : (
                             <>
                                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Bấm để tải lên</span> hoặc kéo thả</p>
                                <p className="text-xs text-slate-500">Chỉ nhận file .TXT</p>
                            </>
                        )}
                    </div>
                    <input id="dropzone-file" ref={fileInputRef} type="file" className="hidden" accept=".txt" onChange={handleFileChange} />
                </label>
            </div> 
          </div>
        </div>
        {error && <p className="text-red-400 text-sm pt-2 text-center md:text-left">{error}</p>}
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