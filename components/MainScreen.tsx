
import React, { useState, useCallback } from 'react';
import { JobForm } from './JobForm';
import { JobTable } from './JobTable';
import type { Job, PromptConfig } from '../types';
import { JobStatus } from '../types';
import * as geminiService from '../services/geminiService';
import { downloadFile } from '../utils/fileUtils';

interface MainScreenProps {
  prompts: PromptConfig;
}

export const MainScreen: React.FC<MainScreenProps> = ({ prompts }) => {
  const [jobs, setJobs] = useState<Job[]>([]);

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(prevJobs =>
      prevJobs.map(job => (job.id === id ? { ...job, ...updates } : job))
    );
  };

  const processJob = useCallback(async (job: Job) => {
    try {
      updateJob(job.id, { status: JobStatus.PROCESSING, progress: 0, progressMessage: 'Bắt đầu...' });

      updateJob(job.id, { progress: 0.05, progressMessage: '1/6: Đang tạo dàn ý...' });
      const outline = await geminiService.generateOutline(job.title, prompts);
      if (!outline || outline.length < 2) throw new Error("Không thể tạo dàn ý hợp lệ.");

      updateJob(job.id, { progress: 0.15, progressMessage: '2/6: Đang viết mở đầu...' });
      const intro = await geminiService.generateIntro(job.title, outline[0], prompts);

      updateJob(job.id, { progress: 0.30, progressMessage: '3/6: Đang viết nội dung chính...' });
      const contentPromises = outline.slice(1).map((point) => geminiService.generateContent(job.title, point, prompts));
      const resolvedContent = await Promise.all(contentPromises);
      const contentParts = resolvedContent.map((content, index) => `\n\n## ${outline[index + 1]}\n\n${content}`);
      const fullScript = `# ${job.title}\n\n## ${outline[0]}\n\n${intro}${contentParts.join('')}`;
      
      updateJob(job.id, { progress: 0.65, progressMessage: '4/6: Đang tạo SEO...' });
      const seoResult = await geminiService.generateSEO(job.title, fullScript, prompts);
      const saleContent = `Tiêu đề: ${seoResult.title}\n\nMô tả:\n${seoResult.description}\n\nTừ khóa:\n${seoResult.keywords.join(', ')}`;

      updateJob(job.id, { progress: 0.80, progressMessage: '5/6: Đang tạo prompt video...' });
      const videoPromptContent = await geminiService.generateVideoPrompts(fullScript, prompts);

      updateJob(job.id, { progress: 0.90, progressMessage: '6/6: Đang tạo thumbnail...' });
      const thumbnailBase64 = await geminiService.generateThumbnail(job.title);

      updateJob(job.id, {
        status: JobStatus.COMPLETED,
        progress: 1,
        progressMessage: 'Hoàn thành!',
        output: {
          content: fullScript,
          sale: saleContent,
          videoPrompt: videoPromptContent,
          thumbnail: thumbnailBase64,
        },
      });

    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);
      let currentProgress = 0;
      setJobs(prev => {
        const failedJob = prev.find(j => j.id === job.id);
        currentProgress = failedJob?.progress ?? 0;
        return prev;
      });
      updateJob(job.id, {
        status: JobStatus.ERROR,
        error: error.message || 'Lỗi không xác định',
        progressMessage: 'Đã xảy ra lỗi',
        progress: currentProgress,
      });
    }
  }, [prompts]);
  

  const handleAddJob = (jobData: Omit<Job, 'id' | 'status' | 'progressMessage' | 'progress'>) => {
    const newJob: Job = {
      ...jobData,
      id: `${jobData.videoCode}-${Date.now()}`,
      status: JobStatus.WAITING,
      progress: 0,
      progressMessage: 'Sẵn sàng',
    };
    setJobs(prev => [newJob, ...prev]);
  };

  const handleRunJob = (jobId: string) => {
    const jobToRun = jobs.find(j => j.id === jobId);
    if (jobToRun) {
      processJob(jobToRun);
    }
  };

  const handleRunAll = () => {
    const waitingJobs = jobs.filter(job => job.status === JobStatus.WAITING);
    // This runs them concurrently
    Promise.allSettled(waitingJobs.map(job => processJob(job)));
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleDeleteAll = () => {
    setJobs([]);
  };

  const handleDownload = (job: Job, fileType: 'content' | 'sale' | 'videoPrompt' | 'thumbnail') => {
    if (!job.output) return;
    const { videoCode, output } = job;
    switch (fileType) {
      case 'content':
        downloadFile(`${videoCode}_content.txt`, output.content, 'text/plain');
        break;
      case 'sale':
        downloadFile(`${videoCode}_sale.txt`, output.sale, 'text/plain');
        break;
      case 'videoPrompt':
        downloadFile(`${videoCode}_prom_video.txt`, output.videoPrompt, 'text/plain');
        break;
      case 'thumbnail':
        downloadFile(`${videoCode}_thumbnail.jpg`, output.thumbnail, 'image/jpeg', true);
        break;
    }
  };

  return (
    <div className="space-y-8">
      <JobForm onAddJob={handleAddJob} />
      <JobTable
        jobs={jobs}
        onRunJob={handleRunJob}
        onRunAll={handleRunAll}
        onDeleteJob={handleDeleteJob}
        onDeleteAll={handleDeleteAll}
        onDownload={handleDownload}
      />
    </div>
  );
};
