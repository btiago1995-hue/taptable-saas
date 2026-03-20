"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, AlertCircle, Save, X, Loader2, Search, Edit2, Store, Upload } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useMenu, MenuItem } from "@/lib/MenuContext";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableCategoryTab({ cat, activeTab, onClick }: { cat: string, activeTab: string, onClick: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: cat });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex-shrink-0 touch-none outline-none">
            <button
                onClick={onClick}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === cat
                    ? "bg-white text-primary-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent"
                    }`}
            >
                {cat}
            </button>
        </div>
    );
}

export default function AdminMenuPage() {
    const { items: dbItems, categories: dbCategories, setItems: setDbItems, setCategories: setDbCategories } = useMenu();

    // Local Staging State
    const [localCategories, setLocalCategories] = useState<string[]>([]);
    const [localItems, setLocalItems] = useState<MenuItem[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize local state from DB on mount or when DB changes
    useEffect(() => {
        if (!hasUnsavedChanges) {
            setLocalCategories(dbCategories);
            setLocalItems(dbItems);
        }
    }, [dbCategories, dbItems, hasUnsavedChanges]);

    const [activeTab, setActiveTab] = useState(localCategories[0] || "Pratos Principais");

    // Ensure active tab is valid
    useEffect(() => {
        if (localCategories.length > 0 && !localCategories.includes(activeTab)) {
            setActiveTab(localCategories[0]);
        }
    }, [localCategories, activeTab]);

    const [searchQuery, setSearchQuery] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setLocalCategories((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
            setHasUnsavedChanges(true);
        }
    }

    // Modal State
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState({ name: "", price: "", status: "available", category: "", description: "", imageUrl: "" });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();

    const filteredItems = localItems.filter(
        item => item.category === activeTab && item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddCategory = () => {
        const title = prompt("Nome da nova categoria:");
        if (title && !localCategories.includes(title)) {
            setLocalCategories([...localCategories, title]);
            setActiveTab(title);
            setHasUnsavedChanges(true);
        }
    };

    const handleOpenModal = (item?: MenuItem) => {
        setImageFile(null);
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, price: item.price.toString(), status: item.status, category: item.category, description: item.description || "", imageUrl: item.imageUrl || "" });
        } else {
            setEditingItem(null);
            setFormData({ name: "", price: "", status: "available", category: activeTab, description: "", imageUrl: "" });
        }
        setIsItemModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            setFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) })); // Local preview
        }
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceNum = parseFloat(formData.price.replace(",", "."));
        if (!formData.name || isNaN(priceNum) || !user?.restaurantId) return;

        setIsUploading(true);
        let finalImageUrl = formData.imageUrl;

        try {
            // If the user selected a new file, upload it to Supabase Storage
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${user.restaurantId}/${crypto.randomUUID()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('menu-images')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('menu-images')
                    .getPublicUrl(fileName);

                finalImageUrl = publicUrlData.publicUrl;
            }

            if (editingItem) {
                setLocalItems(localItems.map(i => i.id === editingItem.id ? { ...editingItem, ...formData, imageUrl: finalImageUrl, price: priceNum } as MenuItem : i));
            } else {
                const newItem: MenuItem = {
                    id: crypto.randomUUID(),
                    name: formData.name,
                    price: priceNum,
                    status: formData.status as "available" | "sold_out",
                    category: formData.category,
                    description: formData.description,
                    imageUrl: finalImageUrl
                };
                setLocalItems([...localItems, newItem]);
            }
            setHasUnsavedChanges(true);
            setIsItemModalOpen(false);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Erro ao enviar a imagem. Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };


    const handleDeleteItem = (id: string) => {
        if (confirm("Tem certeza que deseja excluir este prato?")) {
            setLocalItems(localItems.filter(i => i.id !== id));
            setHasUnsavedChanges(true);
        }
    };

    const toggleStatus = (id: string, currentStatus: string) => {
        setLocalItems(localItems.map(i => i.id === id ? { ...i, status: currentStatus === "available" ? "sold_out" : "available" } : i));
        setHasUnsavedChanges(true);
    };

    const [isSavingAll, setIsSavingAll] = useState(false);

    const handleSaveChanges = async () => {
        setIsSavingAll(true);
        try {
            // Must save categories first because items depend on them (foreign keys)
            await setDbCategories(localCategories);
            await setDbItems(localItems);
            setHasUnsavedChanges(false);
            // Optional: show a toast success message here
            alert("Cardápio salvo com sucesso na nuvem!");
        } catch (error) {
            console.error("Erro ao salvar cardápio na nuvem:", error);
            alert("Erro ao salvar as mudanças. Tente novamente.");
        } finally {
            setIsSavingAll(false);
        }
    };

    return (
        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">Gestão de Cardápio</h1>
                        {hasUnsavedChanges && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-md animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" /> Mudanças Pendentes
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500">Adicione e organize os pratos exibidos no menu digital.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={handleAddCategory} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm">
                        Nova Categoria
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-colors">
                        <Plus className="w-5 h-5" />
                        Novo Prato
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={!hasUnsavedChanges || isSavingAll}
                        className={cn(
                            "px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all",
                            hasUnsavedChanges && !isSavingAll
                                ? "bg-primary-600 hover:bg-primary-700 text-white transform hover:scale-105"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSavingAll ? "Salvando na Nuvem..." : "Salvar na Base de Dados"}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[500px]">

                {/* Toolbar & Categories */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide border-r border-transparent sm:border-slate-200 pr-4">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={localCategories} strategy={horizontalListSortingStrategy}>
                                {localCategories.map(cat => (
                                    <div key={cat} className="flex items-center gap-1 group/cat">
                                        <SortableCategoryTab cat={cat} activeTab={activeTab} onClick={() => setActiveTab(cat)} />
                                    </div>
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar prato..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Item List */}
                <div className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase bg-slate-50/50">
                                <th className="font-semibold px-6 py-4">Item</th>
                                <th className="font-semibold px-6 py-4 hidden sm:table-cell">Preço</th>
                                <th className="font-semibold px-6 py-4">Status</th>
                                <th className="font-semibold px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {item.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                                    <ImageIcon className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-slate-900">{item.name}</p>
                                                {item.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px] mt-0.5">{item.description}</p>
                                                )}
                                                <p className="text-xs text-slate-500 mt-0.5 md:hidden font-semibold">{formatCurrency(item.price)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-700 hidden sm:table-cell whitespace-nowrap">
                                        {formatCurrency(item.price)}
                                    </td>
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => toggleStatus(item.id, item.status)}>
                                        {item.status === "available" ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors">
                                                Disponível
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors">
                                                Esgotado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-primary-600 bg-white hover:bg-primary-50 rounded-lg shadow-sm border border-slate-200 transition-colors" title="Editar">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-slate-200 transition-colors" title="Excluir">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredItems.length === 0 && (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="bg-slate-100 p-4 rounded-full mb-4">
                                <Store className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Crie seu primeiro prato</h3>
                            <p className="text-slate-500 text-sm max-w-sm mb-6">Esta categoria ainda está vazia ou a busca não encontrou resultados.</p>
                            <button onClick={() => handleOpenModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                                Novo Prato
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* CRUD Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900">{editingItem ? "Editar Prato" : "Novo Prato"}</h3>
                            <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do Prato</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors"
                                    placeholder="Ex: Risotto Cacio e Pepe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição <span className="text-slate-400 font-normal">(Opcional)</span></label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors resize-none"
                                    placeholder="Ex: Pão artesanal tostado com tomates frescos, manjericão e azeite."
                                    rows={2}
                                />
                            </div>

                            <div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-0.5">Foto do Prato <span className="text-slate-400 font-normal">(Recomendado)</span></label>
                                    <p className="text-[11px] text-slate-500 mb-2">Para melhor enquadramento no menu, use imagens Quadradas (1:1) com cerca de 400x400px.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {formData.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl px-4 py-3 flex flex-col items-center justify-center gap-1 transition-colors">
                                            <Upload className="w-4 h-4 text-slate-500" />
                                            <span className="text-xs font-semibold text-slate-600">Clique para enviar uma foto</span>
                                            <span className="text-[10px] text-slate-400">JPG, PNG (Máx 2MB)</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preço (CVE)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors"
                                        placeholder="Ex: 2500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors"
                                    >
                                        <option value="available">Disponível</option>
                                        <option value="sold_out">Esgotado</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors"
                                >
                                    {localCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} disabled={isUploading} className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isUploading} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-80">
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {isUploading ? "Salvando..." : "Salvar Prato"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
