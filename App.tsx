import React, { useState, useCallback } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { MainScreen } from './components/MainScreen';
import { CogIcon, PlayIcon } from './components/icons/Icons';
import type { AppConfig } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

enum Screen {
  SETUP,
  MAIN,
}

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.MAIN);
  const [config, setConfig] = useLocalStorage<AppConfig>('appConfig', {
    prompts: {
        outline: 'Dựa vào nội dung này ..., hãy tạo cho tôi 1 dàn ý nội dung gồm 10 phần. Lưu ý: kịch bản sẽ cho video tiktok nên đoạn đầu tiên cần hấp dẫn, có nhiều câu hỏi, có nhiều bí ẩn, có nhiều plot-twist để giữ chân người dùng. Hiển thị kết quả theo cấu trúc sau:\n[Tên phần]: Nội dung chính; Thời gian; Câu mở đầu; Câu kết thúc;',
        intro: 'Dựa vào ý này: "..." và kết hợp với nội dung gốc. Hãy viết cho tôi đoạn mở đầu hấp dẫn. Viết bằng tiếng Việt. Đoạn này có độ dài không quá 200 chữ theo cách đếm của google docs.',
        content: 'Dựa vào ý này: "..." và kết hợp với nội dung gốc. Hãy viết cho tôi đoạn tiếp theo liền kết với đoạn trên. Viết bằng tiếng Việt. Đoạn này có độ dài không quá 200 chữ theo cách đếm của google docs.',
        seo: 'Làm cho tôi 2 việc sau:\nViệc 1: Dựa vào tiêu đề video dưới, viết một tả video này trên youtube cho tôi, độ dài 100 từ, viết bằng tiếng Indonesia, cần có 2 lần xuất hiện từ "CHỮA LÀNH" và "NIỀM TIN" trong đoạn văn.\nViệc 2: SEO cho video tôi với tiêu đề dưới bằng cách gợi ý 10 từ khóa thẻ tag, trong đó mỗi từ khóa 3, 2 từ, viết mỗi danh dạng ngang cách nhau bằng dấu ",".\nTrả lời theo cấu trúc sau:\nTiêu đề... (tối đa... 7 từ khóa)...\nTiêu đề video cần làm đây:',
        videoPrompt: 'Dựa vào kịch bản sau: "...", hãy gợi ý cho tôi 80 prompt tương ứng với 80 scence phía trên. 80 prompt này sẽ được dùng để tạo video trên các nền tảng AI như Midjourney, Heygen. 80 prompt này phải ở dạng [Shot type] of [Scene/Motion], [lighting & Mood], [Camera movement], [Style/Detail level] để dễ dàng copy-paste vào các ứng dụng tạo video vvv2.\nVideo cần có người, hãy luôn luôn có gương mặt giống người việt nam. Video cần đồng nhất tổng màu, trong đó có mã số #.... Video cần thể hiện sự đơn giản, hợp lý. Loại bỏ tất cả các cảnh phim không cần thiết. Video full frame, no black bars, no letterbox. Hiển thị prompt rành mạch dạng dòng, không có số thứ tự.\nToànk cảnh từ ngữ vi phạm khi dùng vvv2. Chỉ hiển thị tiếng anh cho tôi.'
    },
    accounts: [],
    otherApis: [],
  });

  const handleSaveConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    alert('Cấu hình đã được lưu!');
    setActiveScreen(Screen.MAIN);
  }, [setConfig]);
  
  const NavButton: React.FC<{ screen: Screen; label: string; icon: React.ReactNode }> = ({ screen, label, icon }) => (
    <button
      onClick={() => setActiveScreen(screen)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
        activeScreen === screen
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-slate-800/80 backdrop-blur-sm shadow-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-wider">
            AI Video Script Generator
          </h1>
          <nav className="flex items-center gap-4">
            <NavButton screen={Screen.MAIN} label="Sử dụng" icon={<PlayIcon />} />
            <NavButton screen={Screen.SETUP} label="Cài đặt" icon={<CogIcon />} />
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-6">
        {activeScreen === Screen.SETUP && (
          <SetupScreen initialConfig={config} onSave={handleSaveConfig} />
        )}
        {activeScreen === Screen.MAIN && <MainScreen prompts={config.prompts} />}
      </main>
    </div>
  );
};

export default App;