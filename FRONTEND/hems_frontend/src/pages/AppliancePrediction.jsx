import React from 'react';
import SectionHeader from '../components/ui/SectionHeader';
import PredictionForm from '../components/energy/PredictionForm';
import PredictionResultCards from '../components/energy/PredictionResultCards';
import ComputedFeatures from '../components/energy/ComputedFeatures';
import MiniPredictionChart from '../components/charts/MiniPredictionChart';
import { useAppliancePrediction } from '../hooks/useAppliancePrediction';
import { Zap, Trash2 } from 'lucide-react';

const AppliancePrediction = () => {
    const { runPrediction, isLoading, result, predictionHistory, clearHistory } = useAppliancePrediction();

    // Handler to proxy to the hook
    const handlePredictionSubmit = (formData) => {
        runPrediction(formData);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 fade-in-up">
            <SectionHeader 
                title="Electrical Appliances Predictor" 
                subtitle="Live load parameters and ML predictions specifically trained on lighting/appliance profiles."
                rightElement={
                    <div className="bg-brand/10 text-brand px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                        Live Connection
                    </div>
                }
            />

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Input Form */}
                <div className="lg:col-span-5 space-y-6">
                    <PredictionForm onSubmit={handlePredictionSubmit} isLoading={isLoading} />
                    
                    <div className="block lg:hidden">
                        <ComputedFeatures formData={{}} />
                    </div>
                </div>

                {/* Right: Results & Chart */}
                <div className="lg:col-span-7 space-y-6">
                    <PredictionResultCards result={result} />
                    
                    {/* Render Mini chart inside a nice glass card */}
                    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm tracking-wide text-zinc-400 font-bold uppercase flex items-center gap-2">
                                <Zap className="w-4 h-4 text-brand" /> Prediction History
                            </h3>
                            {predictionHistory.length > 0 && (
                                <button 
                                    onClick={clearHistory}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                    title="Clear all predictions"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <MiniPredictionChart history={predictionHistory} />
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default AppliancePrediction;
