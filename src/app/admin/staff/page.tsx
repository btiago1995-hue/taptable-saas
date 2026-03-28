"use client";

import { toast, showConfirm } from "@/lib/toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Users, UserPlus, ChefHat, User, Shield, Loader2, Trash2, Banknote, Store, PieChart, Navigation, Pencil } from "lucide-react";
import { createStaffMember, updateStaffMember } from "@/app/actions/staff";

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  email?: string;
  access_modules?: string[];
}

export default function StaffManagementPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({ 
      name: '', email: '', password: '', role: 'waiter', 
      accessModules: ['waiter'] 
  });

  const availableModules = [
      { id: 'waiter', label: 'Painel Garçom (Mesas)', icon: <User className="w-4 h-4 text-blue-600" /> },
      { id: 'kitchen', label: 'Cozinha (KDS)', icon: <ChefHat className="w-4 h-4 text-orange-600" /> },
      { id: 'driver', label: 'App Entregador (Motoboy)', icon: <Navigation className="w-4 h-4 text-teal-600" /> },
      { id: 'cashier', label: 'Caixa Fechamento', icon: <Banknote className="w-4 h-4 text-emerald-600" /> },
      { id: 'menu', label: 'Editar Cardápio', icon: <Store className="w-4 h-4 text-indigo-600" /> },
      { id: 'dashboard', label: 'Acesso às Finanças', icon: <PieChart className="w-4 h-4 text-purple-600" /> }
  ];

  useEffect(() => {
    if (user?.restaurantId) {
      fetchStaff();
    }
  }, [user]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('restaurant_id', user?.restaurantId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error("Error loading staff:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleModule = (moduleId: string) => {
      setFormData(prev => {
          const current = prev.accessModules;
          const updated = current.includes(moduleId) 
              ? current.filter(m => m !== moduleId)
              : [...current, moduleId];
          
          // Auto-adjust base role based on first checked item for aesthetic icon in the table
          let inferRole = prev.role;
          if (updated.includes('manager') || updated.includes('dashboard')) inferRole = 'manager';
          else if (updated.includes('kitchen')) inferRole = 'kitchen';
          else if (updated.includes('driver')) inferRole = 'driver';
          else if (updated.includes('waiter')) inferRole = 'waiter';

          return { ...prev, accessModules: updated, role: inferRole };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (!user?.restaurantId) throw new Error("Restaurante não identificado.");

      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
          if (key === 'accessModules') {
              formPayload.append(key, JSON.stringify(val));
          } else {
              formPayload.append(key, val as string);
          }
      });

      let result;
      if (editingStaffId) {
          result = await updateStaffMember(editingStaffId, formPayload, user.restaurantId);
      } else {
          result = await createStaffMember(formPayload, user.restaurantId);
      }

      if (result.error) {
        setFeedback({ type: 'error', msg: result.error });
      } else if (result.success) {
        setFeedback({ type: 'success', msg: editingStaffId ? "Acessos atualizados com sucesso!" : "Membro adicionado com sucesso!" });
        setFormData({ name: '', email: '', password: '', role: 'waiter', accessModules: ['waiter'] });
        setTimeout(() => { setIsModalOpen(false); setEditingStaffId(null); }, 2000);
        fetchStaff();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || "Falha inesperada." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (member: StaffProfile) => {
      setFeedback(null);
      setEditingStaffId(member.id);
      setFormData({
          name: member.name,
          email: member.email || '',
          password: '',
          role: member.role,
          accessModules: member.access_modules || []
      });
      setIsModalOpen(true);
  };

  const deleteStaff = async (staffId: string) => {
    showConfirm("Tem certeza que deseja remover este membro da equipe? O acesso será revogado.", async () => {
    
    // In a real app we would call a server action to use the admin client to delete the auth.users record.
    // For MVP, we will just delete the public profile and ignore the auth ghost record to simplify.
    const { error } = await supabase.from('users').delete().eq('id', staffId);
    if(error){
        toast.error("Erro ao remover: " + error.message);
    } else {
        fetchStaff();
    }
    });
  }

  const roleIconInfo = {
    'manager': { icon: <Shield className="w-4 h-4 text-purple-600" />, bg: "bg-purple-100", text: "text-purple-700", label: "Gerente" },
    'kitchen': { icon: <ChefHat className="w-4 h-4 text-orange-600" />, bg: "bg-orange-100", text: "text-orange-700", label: "Cozinha" },
    'driver': { icon: <Navigation className="w-4 h-4 text-teal-600" />, bg: "bg-teal-100", text: "text-teal-700", label: "Entregador" },
    'waiter': { icon: <User className="w-4 h-4 text-blue-600" />, bg: "bg-blue-100", text: "text-blue-700", label: "Garçom" },
  } as Record<string, any>;

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-500" />
            Equipe & Acessos
          </h1>
          <p className="text-slate-500 mt-2">Gerencie os funcionários e os seus acessos.</p>
        </div>
        <button 
            onClick={() => { 
                setFeedback(null); 
                setEditingStaffId(null);
                setFormData({ name: '', email: '', password: '', role: 'waiter', accessModules: ['waiter'] });
                setIsModalOpen(true); 
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/30"
        >
          <UserPlus className="w-5 h-5" /> Adicionar Membro
        </button>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
             <Loader2 className="w-8 h-8 animate-spin mb-4 text-slate-300" />
             Carregando equipe...
          </div>
        ) : staff.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
                Nenhum funcionário cadastrado ainda.
            </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Membro</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Cargo / Acesso</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{member.name}</div>
                    {/* The email would generally require admin fetch, but we skip displaying it here for privacy or simplicity unless fetched */}
                    <div className="text-sm text-slate-500 font-mono text-xs mt-1">ID: {member.id.substring(0,8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${roleIconInfo[member.role]?.bg} ${roleIconInfo[member.role]?.text} mb-2`}>
                        {roleIconInfo[member.role]?.icon}
                        {roleIconInfo[member.role]?.label || member.role}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {(member.access_modules || []).map(mod => (
                            <span key={mod} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                                {mod}
                            </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.id !== user?.id && (
                        <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(member)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Acessos">
                                <Pencil className="w-5 h-5" />
                            </button>
                            <button onClick={() => deleteStaff(member.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover Acesso">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
            
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {editingStaffId ? <Pencil className="w-6 h-6 text-primary-500" /> : <UserPlus className="w-6 h-6 text-primary-500" />} 
                {editingStaffId ? "Editar Acessos" : "Novo Membro"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input required type="text" name="name" value={formData.name} disabled={!!editingStaffId} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder-slate-400 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500" placeholder="Ex: João Silva" />
              </div>
              
              {!editingStaffId && (
                  <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail (Login)</label>
                        <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder-slate-400 transition-all font-medium text-slate-800" placeholder="joao@restaurante.com" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Senha Provisória</label>
                        <input required type="password" name="password" minLength={6} value={formData.password} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder-slate-400 transition-all font-medium text-slate-800" placeholder="Mínimo 6 caracteres" />
                      </div>
                  </>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Permissões de Acesso</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                    {availableModules.map((mod) => (
                        <label key={mod.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                            <input 
                                type="checkbox" 
                                checked={formData.accessModules.includes(mod.id)}
                                onChange={() => toggleModule(mod.id)}
                                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 transition-all"
                            />
                            <div className="flex bg-white p-1.5 rounded-md shadow-sm border border-slate-200">
                                {mod.icon}
                            </div>
                            <span className="text-sm font-medium text-slate-700 select-none flex-1">
                                {mod.label}
                            </span>
                        </label>
                    ))}
                    {formData.accessModules.length === 0 && (
                        <p className="text-xs text-red-500 ml-2 animate-pulse mt-2">Você precisará selecionar pelo menos um módulo.</p>
                    )}
                </div>
              </div>

              {feedback && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${feedback.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {feedback.msg}
                  </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button disabled={isSubmitting} type="submit" className="flex-2 w-2/3 bg-slate-900 text-white font-semibold rounded-xl px-4 py-2.5 hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingStaffId ? "Salvar Acessos" : "Criar Acesso"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
