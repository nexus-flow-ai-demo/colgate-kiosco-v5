import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types-simple";

interface ClientInteraction {
  created_at: string;
  id: string;
  kiosk_code: string;
  interaction_type: 'voice' | 'touch';
  identified_need: string;
  product_recommended: string;
  session_status: string;
}

const Dashboard = () => {
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [filteredData, setFilteredData] = useState<ClientInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [zone, setZone] = useState('Todos');
  const [country] = useState('Venezuela'); // Bloqueado por ahora
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');

  // Función para cargar datos desde Supabase
  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v5_client_interactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching interactions:', error);
      } else {
        setInteractions(data || []);
        setFilteredData(data || []);
      }
    } catch (error) {
      console.error('Error in fetchInteractions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchInteractions();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = interactions;

    // Filtrar por fecha
    if (dateFrom) {
      filtered = filtered.filter(item => 
        new Date(item.created_at) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(item => 
        new Date(item.created_at) <= new Date(dateTo + 'T23:59:59')
      );
    }

    // Filtrar por zona (simulado por ahora)
    if (zone !== 'Todos') {
      filtered = filtered.filter(item => item.kiosk_code.includes(zone));
    }

    setFilteredData(filtered);
  }, [interactions, dateFrom, dateTo, zone]);

  // Calcular métricas dinámicamente
  const calculateMetrics = () => {
    const total = filteredData.length;
    const voiceCount = filteredData.filter(item => item.interaction_type === 'voice').length;
    const touchCount = filteredData.filter(item => item.interaction_type === 'touch').length;
    
    const luminousCount = filteredData.filter(item => item.product_recommended === 'v5_luminous_white_lovers').length;
    const totalCount = filteredData.filter(item => item.product_recommended === 'v5_total_whitening').length;
    
    const manchasCount = filteredData.filter(item => item.identified_need === 'manchas_cafe').length;
    const proteccionCount = filteredData.filter(item => item.identified_need === 'proteccion_integral').length;
    
    return {
      totalInteractions: total,
      voicePercentage: total > 0 ? Math.round((voiceCount / total) * 100) : 0,
      touchPercentage: total > 0 ? Math.round((touchCount / total) * 100) : 0,
      luminousPercentage: total > 0 ? Math.round((luminousCount / total) * 100) : 0,
      totalPercentage: total > 0 ? Math.round((totalCount / total) * 100) : 0,
      manchasPercentage: total > 0 ? Math.round((manchasCount / total) * 100) : 0,
      proteccionPercentage: total > 0 ? Math.round((proteccionCount / total) * 100) : 0,
    };
  };

  // Calcular bloques de horas (24h)
  const calculateTimeBlocks = () => {
    const blocks: Record<string, number> = {};
    
    filteredData.forEach(item => {
      const date = new Date(item.created_at);
      const hour = date.getHours(); // 0 a 23
      const nextHour = (hour + 1) % 24;
      
      const label = `${hour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`;
      
      blocks[label] = (blocks[label] || 0) + 1;
    });

    // Ordenar cronológicamente y generar colores
    const colors = ['#f43f5e', '#f97316', '#eab308', '#84cc16', '#14b8a6', '#3b82f6', '#8b5cf6', '#d946ef'];
    
    return Object.keys(blocks).sort().map((label, index) => ({
      label,
      value: blocks[label],
      color: colors[index % colors.length]
    }));
  };

  const metrics = calculateMetrics();
  const timeBlocksData = calculateTimeBlocks();

  const handlePrint = () => {
    window.print();
  };

  // Componente de KPI Card
  const KPICard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  // Componente de Gráfica Circular (Pie Chart)
  const PieChart = ({ 
    title, 
    data, 
    size = 200 
  }: { 
    title: string; 
    data: Array<{ label: string; value: number; color: string }>;
    size?: number;
  }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;
    
    const gradientStops = data.map(item => {
      const startPercentage = cumulativePercentage;
      cumulativePercentage += (item.value / total) * 100;
      const endPercentage = cumulativePercentage;
      
      return `${item.color} ${startPercentage}% ${endPercentage}%`;
    }).join(', ');

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">{title}</h4>
        
        <div className="flex flex-col items-center">
          {/* Gráfica Circular */}
          <div 
            className="relative rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              background: data.length > 0 ? `conic-gradient(${gradientStops})` : '#e5e7eb',
            }}
          >
            {/* Hueco central (Donut Chart) */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full"
              style={{
                width: `${size * 0.6}px`,
                height: `${size * 0.6}px`,
              }}
            >
              <div className="flex items-center justify-center h-full">
                <span className="text-lg font-bold text-gray-900">{total}</span>
              </div>
            </div>
          </div>
          
          {/* Leyenda */}
          <div className="mt-4 space-y-2 w-full max-h-40 overflow-y-auto pr-2">
            {data.length === 0 && <div className="text-center text-sm text-gray-500">Sin datos</div>}
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700">{item.label}</span>
                </div>
                <span className="font-medium text-gray-900 ml-2">
                  {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* BARRA SUPERIOR */}
      <div className="bg-gray-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold">
              🦷 COLGATE
            </div>
            <div className="text-sm text-gray-300">
              Dashboard Corporativo V5
            </div>
          </div>
          <button
            onClick={fetchInteractions}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Sincronizando...' : 'Sincronizar Datos (Refresh)'}</span>
          </button>
        </div>
      </div>

      {/* FILTROS GLOBALES */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filtros de Reportes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Rango de Fechas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por Estado/Zona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado/Zona</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos</option>
                <option value="CCS">Gran Caracas</option>
                <option value="ORI">Oriente</option>
                <option value="OCC">Occidente</option>
              </select>
            </div>

            {/* Filtro por País */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
              <select
                value={country}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              >
                <option value="Venezuela">Venezuela</option>
              </select>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN POR TABS */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Visión General
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📄 Reportes PDF
              </button>
            </nav>
          </div>
        </div>

        {/* CONTENIDO DE LAS TABS */}
        {activeTab === 'overview' && (
          <div className="space-y-6 print:hidden">
            {/* KPIs - Fila 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard 
                title="Total de Interacciones" 
                value={metrics.totalInteractions} 
                subtitle="Período seleccionado"
              />
              <KPICard 
                title="Tasa de Uso por Voz" 
                value={`${metrics.voicePercentage}%`} 
                subtitle={`${metrics.voicePercentage}% del total`}
              />
              <KPICard 
                title="Tasa de Uso Táctil" 
                value={`${metrics.touchPercentage}%`} 
                subtitle={`${metrics.touchPercentage}% del total`}
              />
            </div>

            {/* Gráficas - Fila 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <PieChart 
                title="Intención de Compra"
                data={[
                  { label: 'Luminous White', value: filteredData.filter(item => item.product_recommended === 'v5_luminous_white_lovers').length, color: '#9333ea' },
                  { label: 'Total Whitening', value: filteredData.filter(item => item.product_recommended === 'v5_total_whitening').length, color: '#2563eb' }
                ]}
                size={160}
              />
              <PieChart 
                title="Necesidades Detectadas"
                data={[
                  { label: 'Manchas de Café', value: filteredData.filter(item => item.identified_need === 'manchas_cafe').length, color: '#ea580c' },
                  { label: 'Protección Total', value: filteredData.filter(item => item.identified_need === 'proteccion_integral').length, color: '#16a34a' }
                ]}
                size={160}
              />
              <PieChart 
                title="Modalidad de Interacción"
                data={[
                  { label: 'Voz', value: filteredData.filter(item => item.interaction_type === 'voice').length, color: '#4f46e5' },
                  { label: 'Táctil', value: filteredData.filter(item => item.interaction_type === 'touch').length, color: '#22c55e' }
                ]}
                size={160}
              />
              {/* Nueva Gráfica: Tráfico por Horas */}
              <PieChart 
                title="Tráfico por Horas (24h)"
                data={timeBlocksData}
                size={160}
              />
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-md p-6 print:shadow-none print:rounded-none">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Reporte de Interacciones</h3>
              <button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors print:hidden"
              >
                📄 Exportar Reporte a PDF
              </button>
            </div>

            {/* RESUMEN EJECUTIVO DEL PERÍODO */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 print:bg-white">
              <h4 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">
                RESUMEN EJECUTIVO DEL PERÍODO
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda - Totales */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Total de Interacciones</span>
                    <span className="text-lg font-bold text-gray-900">{metrics.totalInteractions}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Interacciones por Voz</span>
                    <span className="text-sm font-bold text-gray-900">
                      {metrics.totalInteractions > 0 ? Math.round((metrics.voicePercentage / 100) * metrics.totalInteractions) : 0} ({metrics.voicePercentage}%)
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Interacciones Táctiles</span>
                    <span className="text-sm font-bold text-gray-900">
                      {metrics.totalInteractions > 0 ? Math.round((metrics.touchPercentage / 100) * metrics.totalInteractions) : 0} ({metrics.touchPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Columna Derecha - Desgloses */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Productos Recomendados</div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">• Luminous White</span>
                    <span className="text-sm font-bold text-gray-900">{metrics.luminousPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">• Total Whitening</span>
                    <span className="text-sm font-bold text-gray-900">{metrics.totalPercentage}%</span>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-700 mb-2 mt-4">Necesidades Detectadas</div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">• Manchas de Café</span>
                    <span className="text-sm font-bold text-gray-900">{metrics.manchasPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">• Protección Total</span>
                    <span className="text-sm font-bold text-gray-900">{metrics.proteccionPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLA DE DATOS MODIFICADA (FECHA Y HORA) */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kiosco
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Necesidad Detectada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto Recomendado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((interaction) => {
                    const dateObj = new Date(interaction.created_at);
                    const formattedDate = dateObj.toLocaleDateString('es-VE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    });
                    const formattedTime = dateObj.toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });

                    return (
                      <tr key={interaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formattedDate} <span className="text-gray-500 ml-1">{formattedTime}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interaction.kiosk_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            interaction.interaction_type === 'voice' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {interaction.interaction_type === 'voice' ? '🎤 Voz' : '👆 Táctil'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interaction.identified_need === 'manchas_cafe' ? '☕ Manchas de Café' :
                           interaction.identified_need === 'proteccion_integral' ? '🛡️ Protección Integral' :
                           interaction.identified_need === 'blanqueamiento_general' ? '✨ Blanqueamiento General' :
                           interaction.identified_need === 'bacterias' ? '🦠 Bacterias' :
                           interaction.identified_need}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {interaction.product_recommended === 'v5_total_whitening' 
                            ? 'Total Whitening' 
                            : 'Luminous White Lovers'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay datos para mostrar con los filtros seleccionados
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ESTILOS PARA IMPRESIÓN */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-gray-50,
          .bg-gray-900,
          .shadow-lg,
          .shadow-md,
          .mb-6,
          .mb-4,
          .mb-8,
          .space-y-6,
          .space-y-3,
          .space-y-2,
          .space-y-4,
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;