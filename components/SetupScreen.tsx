import React, { useState } from 'react';
import type { AppConfig, PromptConfig, Account, OtherAPI } from '../types';
import { AccountStatus } from '../types';
import * as geminiService from '../services/geminiService';
import { PlusCircleIcon, TrashIcon, SpinnerIcon } from './icons/Icons';

interface SetupScreenProps {
  initialConfig: AppConfig;
  onSave: (config: AppConfig) => void;
}

const PromptInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}> = ({ label, value, onChange, rows = 5 }) => (
  <div>
    <h3 className="font-bold mb-2 uppercase">{label}</h3>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full bg-white border border-black rounded-none p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

export const SetupScreen: React.FC<SetupScreenProps> = ({ initialConfig, onSave }) => {
  const [config, setConfig] = useState<AppConfig>(initialConfig);

  const handlePromptChange = (id: keyof PromptConfig, value: string) => {
    setConfig(prev => ({ 
        ...prev, 
        prompts: { ...prev.prompts, [id]: value }
    }));
  };

  const handleAddAccount = () => {
    const newAccount: Account = {
        id: `acc-${Date.now()}`,
        key: '',
        status: AccountStatus.UNCHECKED,
    };
    setConfig(prev => ({ ...prev, accounts: [...prev.accounts, newAccount]}));
  };

  const handleRemoveAccount = (id: string) => {
    setConfig(prev => ({ ...prev, accounts: prev.accounts.filter(acc => acc.id !== id)}));
  };

  const handleAccountKeyChange = (id: string, key: string) => {
    setConfig(prev => ({
        ...prev,
        accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, key, status: AccountStatus.UNCHECKED } : acc)
    }))
  };

  const handleCheckKey = async (id: string) => {
    const account = config.accounts.find(acc => acc.id === id);
    if (!account) return;

    setConfig(prev => ({
        ...prev,
        accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, status: AccountStatus.CHECKING } : acc)
    }));

    const isValid = await geminiService.checkApiKey(account.key);

    setConfig(prev => ({
        ...prev,
        accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, status: isValid ? AccountStatus.VALID : AccountStatus.INVALID } : acc)
    }));
  };

  const handleAddOtherApi = () => {
    const newApi: OtherAPI = { id: `api-${Date.now()}`, key: ''};
    setConfig(prev => ({ ...prev, otherApis: [...prev.otherApis, newApi]}));
  };

  const handleRemoveOtherApi = (id: string) => {
     setConfig(prev => ({ ...prev, otherApis: prev.otherApis.filter(api => api.id !== id)}));
  };

  const handleOtherApiKeyChange = (id: string, key: string) => {
    setConfig(prev => ({
        ...prev,
        otherApis: prev.otherApis.map(api => api.id === id ? { ...api, key } : api)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };
  
  const getStatusColor = (status: AccountStatus) => {
    switch(status) {
        case AccountStatus.VALID: return 'text-green-600';
        case AccountStatus.INVALID: return 'text-red-600';
        case AccountStatus.CHECKING: return 'text-blue-600';
        default: return 'text-gray-500';
    }
  }

  return (
    <div className="max-w-7xl mx-auto bg-white p-6 border border-black shadow-lg">
      <header className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">MÀN HÌNH SETUP</h2>
          <div className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          </div>
      </header>
      <form onSubmit={handleSubmit} className="border-t border-black pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">PROMPT KỊCH BẢN</h3>
              <div className="space-y-4">
                <PromptInput label="Prompt lấy dàn ý" value={config.prompts.outline} onChange={val => handlePromptChange('outline', val)} rows={7} />
                <PromptInput label="Prompt phần mở đầu" value={config.prompts.intro} onChange={val => handlePromptChange('intro', val)} rows={3}/>
                <PromptInput label="Prompt các phần khác" value={config.prompts.content} onChange={val => handlePromptChange('content', val)} rows={3}/>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">PROMPT SEO</h3>
              <PromptInput label="Làm cho tôi 2 việc sau:" value={config.prompts.seo} onChange={val => handlePromptChange('seo', val)} rows={7}/>
            </div>
             <div>
              <h3 className="text-lg font-bold mb-4">LẤY PROMPT VIDEO</h3>
              <PromptInput label="Dựa vào kịch bản sau:" value={config.prompts.videoPrompt} onChange={val => handlePromptChange('videoPrompt', val)} rows={7}/>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">SETUP TÀI KHOẢN</h3>
                <button type="button" onClick={handleAddAccount}><PlusCircleIcon /></button>
              </div>
              <div className="space-y-4">
                {config.accounts.map((acc, index) => (
                    <div key={acc.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="font-bold text-sm">TÀI KHOẢN CHATGPT {index + 1}</label>
                            <span className={`text-xs font-semibold ${getStatusColor(acc.status)}`}>{acc.status}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={acc.key}
                                onChange={(e) => handleAccountKeyChange(acc.id, e.target.value)}
                                placeholder="Enter API Key"
                                className="flex-grow w-full bg-white border border-black rounded-none p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="button" onClick={() => handleCheckKey(acc.id)} disabled={acc.status === AccountStatus.CHECKING} className="px-3 py-1 border border-black bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:bg-gray-400">
                                {acc.status === AccountStatus.CHECKING ? <SpinnerIcon /> : 'kiểm tra'}
                            </button>
                            <button type="button" onClick={() => handleRemoveAccount(acc.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">CÁC SETUP KHÁC</h3>
              <div className="space-y-2">
                 {config.otherApis.map(api => (
                    <div key={api.id} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={api.key}
                            onChange={(e) => handleOtherApiKeyChange(api.id, e.target.value)}
                            placeholder="API"
                            className="flex-grow w-full bg-white border border-black rounded-none p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                         <button type="button" onClick={() => handleRemoveOtherApi(api.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                    </div>
                 ))}
                 {/* This seems to just be a list of inputs, maybe add a button to add more? The design is ambiguous. I'll add one. */}
                 <button type="button" onClick={handleAddOtherApi} className="text-sm text-blue-600 hover:underline">+ Thêm API khác</button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-8">
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold py-2 px-12 rounded-none hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border border-black"
          >
            LƯU MẪU
          </button>
        </div>
      </form>
    </div>
  );
};