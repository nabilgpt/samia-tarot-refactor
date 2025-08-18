import React, { useState, useEffect } from 'react';
import { 
  Brain, TrendingUp, Target, Lightbulb, AlertTriangle,
  BarChart3, PieChart, LineChart, DollarSign, Users,
  Calendar, Clock, Star, ArrowUpRight, ArrowDownRight,
  Zap, Eye, Download, RefreshCw, Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const AIBusinessIntelligence = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState({});
  const [predictions, setPredictions] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [marketAnalysis, setMarketAnalysis] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAIData();
    }
  }, [user?.id]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBusinessInsights(),
        loadPredictiveAnalytics(),
        loadRecommendations(),
        loadMarketAnalysis()
      ]);
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessInsights = async () => {
    try {
      const response = await fetch('/api/ai/business-insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        console.error('Failed to load business insights:', response.status);
        setInsights({
          revenueGrowth: { current: 0, predicted: 0, trend: 'neutral', confidence: 0 },
          clientRetention: { current: 0, predicted: 0, trend: 'neutral', confidence: 0 },
          demandForecast: { nextWeek: 0, nextMonth: 0, peakHours: [], confidence: 0 },
          pricing: { optimal: 0, current: 0, potential: 0, confidence: 0 }
        });
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights({
        revenueGrowth: { current: 0, predicted: 0, trend: 'neutral', confidence: 0 },
        clientRetention: { current: 0, predicted: 0, trend: 'neutral', confidence: 0 },
        demandForecast: { nextWeek: 0, nextMonth: 0, peakHours: [], confidence: 0 },
        pricing: { optimal: 0, current: 0, potential: 0, confidence: 0 }
      });
    }
  };

  const loadPredictiveAnalytics = async () => {
    try {
      const response = await fetch('/api/ai/predictive-analytics');
      if (response.ok) {
        const data = await response.json();
        setPredictions(data);
      } else {
        console.error('Failed to load predictive analytics:', response.status);
        setPredictions({
          revenue: { next30Days: 0, next90Days: 0, yearEnd: 0, growthRate: 0 },
          clients: { newClients: 0, churnRisk: 0, lifetimeValue: 0, satisfaction: 0 },
          market: { demand: 'unknown', competition: 'unknown', opportunity: 'unknown', seasonality: 'unknown' }
        });
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      setPredictions({
        revenue: { next30Days: 0, next90Days: 0, yearEnd: 0, growthRate: 0 },
        clients: { newClients: 0, churnRisk: 0, lifetimeValue: 0, satisfaction: 0 },
        market: { demand: 'unknown', competition: 'unknown', opportunity: 'unknown', seasonality: 'unknown' }
      });
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/ai/recommendations');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      } else {
        console.error('Failed to load AI recommendations:', response.status);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations([]);
    }
  };

  const loadMarketAnalysis = async () => {
    try {
      const response = await fetch('/api/ai/market-analysis');
      if (response.ok) {
        const data = await response.json();
        setMarketAnalysis(data);
      } else {
        console.error('Failed to load market analysis:', response.status);
        setMarketAnalysis({
          trends: [],
          competition: { position: 'unknown', advantages: [], threats: [] },
          opportunities: []
        });
      }
    } catch (error) {
      console.error('Error loading market analysis:', error);
      setMarketAnalysis({
        trends: [],
        competition: { position: 'unknown', advantages: [], threats: [] },
        opportunities: []
      });
    }
  };

  const refreshAIData = async () => {
    setRefreshing(true);
    await loadAIData();
    setRefreshing(false);
  };

  const tabs = [
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'market', label: 'Market Analysis', icon: Target }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Business Intelligence</h1>
              <p className="text-gray-600 mt-1">AI-powered insights and predictions for your business</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshAIData}
                disabled={refreshing}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'insights' && (
          <InsightsTab insights={insights} />
        )}

        {activeTab === 'predictions' && (
          <PredictionsTab predictions={predictions} />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab recommendations={recommendations} />
        )}

        {activeTab === 'market' && (
          <MarketAnalysisTab marketAnalysis={marketAnalysis} />
        )}
      </div>
    </div>
  );
};

// Insights Tab Component
const InsightsTab = ({ insights }) => (
  <div className="space-y-8">
    {/* Key Insights */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <InsightCard
        title="Revenue Growth"
        current={`${insights.revenueGrowth?.current}%`}
        predicted={`${insights.revenueGrowth?.predicted}%`}
        trend={insights.revenueGrowth?.trend}
        confidence={insights.revenueGrowth?.confidence}
        icon={DollarSign}
        color="green"
      />
      <InsightCard
        title="Client Retention"
        current={`${insights.clientRetention?.current}%`}
        predicted={`${insights.clientRetention?.predicted}%`}
        trend={insights.clientRetention?.trend}
        confidence={insights.clientRetention?.confidence}
        icon={Users}
        color="blue"
      />
      <InsightCard
        title="Demand Forecast"
        current={`${insights.demandForecast?.nextWeek} bookings`}
        predicted={`${insights.demandForecast?.nextMonth} monthly`}
        trend="up"
        confidence={insights.demandForecast?.confidence}
        icon={Calendar}
        color="purple"
      />
      <InsightCard
        title="Pricing Optimization"
        current={`$${insights.pricing?.current}`}
        predicted={`$${insights.pricing?.optimal} (+${insights.pricing?.potential}%)`}
        trend="up"
        confidence={insights.pricing?.confidence}
        icon={Target}
        color="orange"
      />
    </div>

    {/* Detailed Analysis */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Peak Hours Analysis */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Demand Hours</h3>
        <div className="space-y-4">
          {insights.demandForecast?.peakHours?.map((hour, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-purple-600 mr-3" />
                <span className="font-medium">{hour}</span>
              </div>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${90 - index * 10}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{90 - index * 10}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Confidence Scores */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Confidence Scores</h3>
        <div className="space-y-4">
          <ConfidenceBar label="Revenue Predictions" score={insights.revenueGrowth?.confidence} />
          <ConfidenceBar label="Client Behavior" score={insights.clientRetention?.confidence} />
          <ConfidenceBar label="Demand Forecasting" score={insights.demandForecast?.confidence} />
          <ConfidenceBar label="Pricing Analysis" score={insights.pricing?.confidence} />
        </div>
      </div>
    </div>
  </div>
);

// Predictions Tab Component
const PredictionsTab = ({ predictions }) => (
  <div className="space-y-8">
    {/* Revenue Predictions */}
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Predictions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PredictionCard
          title="Next 30 Days"
          value={`$${predictions.revenue?.next30Days?.toLocaleString()}`}
          change="+12.5%"
          trend="up"
        />
        <PredictionCard
          title="Next 90 Days"
          value={`$${predictions.revenue?.next90Days?.toLocaleString()}`}
          change="+18.2%"
          trend="up"
        />
        <PredictionCard
          title="Year End"
          value={`$${predictions.revenue?.yearEnd?.toLocaleString()}`}
          change="+24.7%"
          trend="up"
        />
      </div>
    </div>

    {/* Client Predictions */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Analytics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">New Clients (Next Month)</span>
            <span className="font-semibold text-green-600">+{predictions.clients?.newClients}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Churn Risk</span>
            <span className="font-semibold text-red-600">{predictions.clients?.churnRisk} clients</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Avg. Lifetime Value</span>
            <span className="font-semibold text-purple-600">${predictions.clients?.lifetimeValue}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Satisfaction Score</span>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="font-semibold">{predictions.clients?.satisfaction}/5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Conditions</h3>
        <div className="space-y-4">
          <MarketIndicator
            label="Demand Trend"
            value={predictions.market?.demand}
            status="positive"
          />
          <MarketIndicator
            label="Competition Level"
            value={predictions.market?.competition}
            status="neutral"
          />
          <MarketIndicator
            label="Growth Opportunity"
            value={predictions.market?.opportunity}
            status="positive"
          />
          <MarketIndicator
            label="Seasonal Factor"
            value={predictions.market?.seasonality}
            status="positive"
          />
        </div>
      </div>
    </div>
  </div>
);

// Recommendations Tab Component
const RecommendationsTab = ({ recommendations }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
      <div className="text-sm text-gray-600">
        {recommendations.length} recommendations available
      </div>
    </div>

    <div className="space-y-4">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </div>
  </div>
);

// Market Analysis Tab Component
const MarketAnalysisTab = ({ marketAnalysis }) => (
  <div className="space-y-8">
    {/* Market Trends */}
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Market Trends</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketAnalysis.trends?.map((trend, index) => (
          <TrendCard key={index} trend={trend} />
        ))}
      </div>
    </div>

    {/* Competitive Position */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitive Position</h3>
        <div className="space-y-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {marketAnalysis.competition?.position}
            </div>
            <div className="text-sm text-green-700">Market Position</div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Competitive Advantages</h4>
            <div className="space-y-2">
              {marketAnalysis.competition?.advantages?.map((advantage, index) => (
                <div key={index} className="flex items-center p-2 bg-blue-50 rounded">
                  <Zap className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-700">{advantage}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Potential Threats</h4>
            <div className="space-y-2">
              {marketAnalysis.competition?.threats?.map((threat, index) => (
                <div key={index} className="flex items-center p-2 bg-red-50 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="text-sm text-red-700">{threat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Opportunities</h3>
        <div className="space-y-3">
          {marketAnalysis.opportunities?.map((opportunity, index) => (
            <div key={index} className="flex items-center p-3 bg-purple-50 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 mr-3" />
              <span className="text-sm text-purple-700">{opportunity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Helper Components
const InsightCard = ({ title, current, predicted, trend, confidence, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Confidence</div>
          <div className="font-semibold text-gray-900">{confidence}%</div>
        </div>
      </div>
      
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <div className="space-y-1">
        <div className="text-sm text-gray-600">Current: {current}</div>
        <div className="text-sm font-medium text-gray-900">Predicted: {predicted}</div>
      </div>
      
      <div className="flex items-center mt-3">
        {trend === 'up' ? (
          <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
        )}
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? 'Improving' : 'Declining'}
        </span>
      </div>
    </div>
  );
};

const ConfidenceBar = ({ label, score }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{score}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${
          score >= 90 ? 'bg-green-500' :
          score >= 80 ? 'bg-blue-500' :
          score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${score}%` }}
      ></div>
    </div>
  </div>
);

const PredictionCard = ({ title, value, change, trend }) => (
  <div className="text-center p-4 bg-gray-50 rounded-lg">
    <div className="text-sm text-gray-600 mb-1">{title}</div>
    <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
    <div className={`flex items-center justify-center text-sm font-medium ${
      trend === 'up' ? 'text-green-600' : 'text-red-600'
    }`}>
      {trend === 'up' ? (
        <ArrowUpRight className="w-4 h-4 mr-1" />
      ) : (
        <ArrowDownRight className="w-4 h-4 mr-1" />
      )}
      {change}
    </div>
  </div>
);

const MarketIndicator = ({ label, value, status }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <span className="text-gray-600">{label}</span>
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
      status === 'positive' ? 'bg-green-100 text-green-800' :
      status === 'neutral' ? 'bg-yellow-100 text-yellow-800' :
      'bg-red-100 text-red-800'
    }`}>
      {value}
    </span>
  </div>
);

const RecommendationCard = ({ recommendation }) => (
  <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${
    recommendation.priority === 'high' ? 'border-red-400' :
    recommendation.priority === 'medium' ? 'border-yellow-400' :
    'border-blue-400'
  } border border-gray-200`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-full mr-3 ${
          recommendation.priority === 'high' ? 'bg-red-100' :
          recommendation.priority === 'medium' ? 'bg-yellow-100' :
          'bg-blue-100'
        }`}>
          <Lightbulb className={`w-5 h-5 ${
            recommendation.priority === 'high' ? 'text-red-600' :
            recommendation.priority === 'medium' ? 'text-yellow-600' :
            'text-blue-600'
          }`} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
            recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {recommendation.priority} priority
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-600">Confidence</div>
        <div className="font-semibold text-gray-900">{recommendation.confidence}%</div>
      </div>
    </div>
    
    <p className="text-gray-600 mb-4">{recommendation.description}</p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-sm text-green-600">Expected Impact</div>
        <div className="font-semibold text-green-700">{recommendation.impact}</div>
      </div>
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-600">Action Required</div>
        <div className="font-semibold text-blue-700">{recommendation.action}</div>
      </div>
      <div className="text-center p-3 bg-purple-50 rounded-lg">
        <div className="text-sm text-purple-600">Timeframe</div>
        <div className="font-semibold text-purple-700">{recommendation.timeframe}</div>
      </div>
    </div>
    
    <div className="flex justify-end space-x-3">
      <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
        Dismiss
      </button>
      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
        Implement
      </button>
    </div>
  </div>
);

const TrendCard = ({ trend }) => (
  <div className="p-4 bg-gray-50 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-medium text-gray-900">{trend.name}</h4>
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        trend.status === 'hot' ? 'bg-red-100 text-red-800' :
        trend.status === 'rising' ? 'bg-green-100 text-green-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {trend.status}
      </span>
    </div>
    <div className="text-lg font-bold text-gray-900">{trend.growth}</div>
  </div>
);

export default AIBusinessIntelligence; 