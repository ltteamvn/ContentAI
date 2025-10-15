
import React, { useState, useCallback } from 'react';
import { JobForm } from './JobForm';
import { JobTable } from './JobTable';
import type { Job, PromptConfig } from '../types';
import { JobStatus } from '../types';
import * as geminiService from '../services/geminiService';
import { downloadFile, zipAndDownloadFiles, getYoutubeVideoId, fetchImageAsBase64 } from '../utils/fileUtils';

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
    const totalSteps = 14; // 1 outline + 10 content parts + 1 seo + 1 video prompt + 1 thumbnail
    try {
      updateJob(job.id, { status: JobStatus.PROCESSING, progress: 0, progressMessage: 'Bắt đầu...' });

      // Step 1: Outline
      updateJob(job.id, { progress: 1/totalSteps, progressMessage: `1/${totalSteps}: Đang tạo dàn ý...` });
      const outline = await geminiService.generateOutline(job.userScript, prompts);
      if (!outline || outline.length < 1) throw new Error("Không thể tạo dàn ý hợp lệ.");

      const scriptParts: string[] = [];

      // Step 2: Intro (Part 1 of content)
      updateJob(job.id, { progress: 2/totalSteps, progressMessage: `2/${totalSteps}: Đang viết mở đầu (Phần 1/${outline.length})...` });
      const intro = await geminiService.generateIntro(outline[0], job.userScript, prompts);
      scriptParts.push(intro);

      // Step 3 to 11: Main Content (Iteratively)
      for (let i = 1; i < outline.length; i++) {
        const currentProgress = i + 2;
        updateJob(job.id, { progress: currentProgress/totalSteps, progressMessage: `${currentProgress}/${totalSteps}: Đang viết nội dung (Phần ${i + 1}/${outline.length})...` });
        const previousContent = scriptParts.join('\n\n');
        const contentPart = await geminiService.generateContent(outline[i], job.userScript, previousContent, prompts);
        scriptParts.push(contentPart);
      }
      
      const fullScript = `# ${job.title}\n\n` + outline.map((point, index) => `## ${point}\n\n${scriptParts[index]}`).join('\n\n');

      // Step 12: SEO
      const seoProgress = totalSteps - 2;
      updateJob(job.id, { progress: seoProgress/totalSteps, progressMessage: `${seoProgress}/${totalSteps}: Đang tạo SEO...` });
      const seoResult = await geminiService.generateSEO(job.title, prompts);
      const saleContent = `Tiêu đề: ${seoResult.title}\n\nMô tả:\n${seoResult.description}\n\nTừ khóa:\n${seoResult.keywords.join(', ')}`;

      // Step 13: Video Prompts
      const videoPromptProgress = totalSteps - 1;
      updateJob(job.id, { progress: videoPromptProgress/totalSteps, progressMessage: `${videoPromptProgress}/${totalSteps}: Đang tạo prompt video...` });
      const videoPromptContent = await geminiService.generateVideoPrompts(fullScript, prompts);

      // Step 14: Thumbnail
      const thumbnailProgress = totalSteps;
      updateJob(job.id, { progress: thumbnailProgress/totalSteps, progressMessage: `${thumbnailProgress}/${totalSteps}: Đang tạo thumbnail...` });
      let thumbnailBase64 = '';
      const videoId = job.youtubeLink ? getYoutubeVideoId(job.youtubeLink) : null;
      if (videoId) {
        try {
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          thumbnailBase64 = await fetchImageAsBase64(thumbnailUrl);
        } catch (e) {
          console.warn("Could not fetch YouTube thumbnail, falling back to AI generation.", e);
          thumbnailBase64 = await geminiService.generateThumbnailFromTitle(job.title);
        }
      } else {
        thumbnailBase64 = await geminiService.generateThumbnailFromTitle(job.title);
      }

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
  

  const handleAddJob = (jobData: { title: string; videoCode: string; youtubeLink?: string; userScript: string; }) => {
    const newJob: Job = {
      id: `${jobData.videoCode}-${Date.now()}`,
      title: jobData.title,
      videoCode: jobData.videoCode,
      youtubeLink: jobData.youtubeLink,
      userScript: jobData.userScript,
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

  const handleDownloadAllForJob = (job: Job) => {
    if (!job.output) return;
    const { videoCode, output } = job;

    zipAndDownloadFiles(videoCode, [
      { name: `${videoCode}-content.txt`, content: output.content },
      { name: `${videoCode}-sale.txt`, content: output.sale },
      { name: `${videoCode}-prom_video.txt`, content: output.videoPrompt },
      { name: `${videoCode}-thumbnail.jpg`, content: output.thumbnail, isBase64: true },
    ]);
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
        onDownloadAll={handleDownloadAllForJob}
      />
    </div>
  );
};