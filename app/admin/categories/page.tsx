'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Plus, Edit3, Trash2, Search, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import PremiumLoader from '@/components/PremiumLoader';
import { useToastStore } from '@/store/toastStore';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();
  const showToast = useToastStore((s) => s.showToast);

  // Data states
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameTe: '',
    slug: '',
    image: '',
    description: '',
    sortOrder: '0',
    isActive: true,
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Auth Protection
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/admin/login');
    } else if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [authStatus, session, router]);

  // Load Categories
  const loadCategories = React.useCallback(() => {
    setLoading(true);
    fetch('/api/categories')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error('Expected array of categories, got:', data);
          setCategories([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching admin categories:', err);
        setCategories([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'ADMIN') {
      loadCategories();
    }
  }, [authStatus, session?.user?.role, loadCategories]);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    if (name === 'name' && !editingCategory) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-');
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      nameTe: '',
      slug: '',
      image: '',
      description: '',
      sortOrder: '0',
      isActive: true,
    });
    setFormError('');
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (c: any) => {
    setEditingCategory(c);
    setFormData({
      name: c.name,
      nameTe: c.nameTe,
      slug: c.slug,
      image: c.image,
      description: c.description || '',
      sortOrder: c.sortOrder.toString(),
      isActive: c.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  // Submit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const { name, slug, image } = formData;
    if (!name || !slug || !image) {
      setFormError(language === 'te' ? 'దయచేసి పేరు, స్లగ్ మరియు చిత్రం వివరాలు నింపండి.' : 'Please fill in name, slug, and image URL.');
      setSaving(false);
      return;
    }

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sortOrder: parseInt(formData.sortOrder),
        }),
      });

      if (res.ok) {
        loadCategories();
        setShowModal(false);
      } else {
        const err = await res.json();
        setFormError(err.error || (language === 'te' ? 'విభాగం సేవ్ చేయడంలో విఫలమైంది.' : 'Failed to save category.'));
      }
    } catch (err) {
      setFormError(language === 'te' ? 'సర్వర్ కనెక్షన్ లోపం.' : 'Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm(language === 'te' ? 'ఈ విభాగాన్ని ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?' : 'Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadCategories();
      } else {
        const err = await res.json();
        showToast(err.error || (language === 'te' ? 'తొలగించడం విఫలమైంది.' : 'Deletion failed.'), 'error');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nameTe.toLowerCase().includes(search.toLowerCase())
  );

  if (authStatus === 'loading' || loading) {
    return <PremiumLoader fullScreen={true} text={t('admin_categories_loading')} />;
  }

  return (
    <>
      
      <main className="max-w-7xl mx-auto sm:px-5 lg:px-8 py-2 sm:py-8 flex-1 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-8 items-start">
          
          <AdminSidebar />

          <section className="flex-1 w-full min-w-0 px-2 sm:px-0 pt-2 sm:pt-0 space-y-4 sm:space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-amber-950 font-heading">
                  {t('admin_categories_title')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('admin_categories_sub')}</p>
              </div>

              <button
                onClick={handleOpenAdd}
                className="bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs px-5 py-3 rounded-full flex items-center justify-center space-x-1.5 shadow-sm hover:shadow"
              >
                <Plus size={16} />
                <span>{t('admin_categories_add')}</span>
              </button>
            </div>

            {/* Search */}
            <div className="bg-white border border-amber-100 p-4 rounded-3xl smooth-shadow flex items-center relative">
              <input
                type="text"
                placeholder={t('admin_categories_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-amber-50/10 text-xs border border-amber-100 rounded-2xl py-2.5 pl-3 pr-10 focus:outline-none"
              />
              <Search size={18} className="absolute right-7 text-gray-400" />
            </div>

            {/* Categories list */}
            <div className="bg-white border border-amber-100 rounded-3xl overflow-hidden smooth-shadow">

              {/* Mobile: Card view */}
              <div className="sm:hidden divide-y divide-amber-50">
                {filteredCategories.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-10">{language === 'te' ? 'విభాగాలు లేవు' : 'No categories found'}</p>
                ) : filteredCategories.map((c) => (
                  <div key={c.id} className="p-4 flex items-center gap-3">
                    <Image
                      src="/images/logo-512.png"
                      alt=""
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-xl object-cover border border-amber-50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-amber-950 text-xs">{language === 'te' ? c.nameTe : c.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{c.slug}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                          c.isActive ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {c.isActive ? (language === 'te' ? 'యాక్టివ్' : 'Active') : (language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive')}
                        </span>
                        <span className="text-[10px] text-gray-400">{language === 'te' ? 'క్రమం' : 'Order'}: {c.sortOrder}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-100 text-[10px] font-bold"
                      >
                        <Edit3 size={11} /> {language === 'te' ? 'ఎడిట్' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 text-[10px] font-bold"
                      >
                        <Trash2 size={11} /> {language === 'te' ? 'డిలీట్' : 'Del'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden sm:block overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs font-medium text-amber-950">
                  <thead className="bg-amber-50 text-[10px] uppercase font-bold text-amber-900 border-b border-amber-100">
                    <tr>
                      <th className="py-3 px-4">{t('admin_categories_th_image')}</th>
                      <th className="py-3 px-4">{t('admin_categories_th_name')}</th>
                      <th className="py-3 px-4">{t('admin_categories_th_slug')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_categories_th_sort')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_categories_th_status')}</th>
                      <th className="py-3 px-4 text-center">{t('admin_categories_th_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {filteredCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/10">
                        <td className="py-3 px-4">
                          <Image
                            src="/images/logo-512.png"
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-xl object-cover border border-amber-50"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-amber-950">{language === 'te' ? c.nameTe : c.name}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-900">{c.slug}</td>
                        <td className="py-3 px-4 text-center font-bold">{c.sortOrder}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                            c.isActive ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                          }`}>
                            {c.isActive ? (language === 'te' ? 'యాక్టివ్' : 'Active') : (language === 'te' ? 'ఇన్‌యాక్టివ్' : 'Inactive')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => handleOpenEdit(c)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-100">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-md bg-white border border-amber-100 rounded-3xl p-6 space-y-4 smooth-shadow animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-amber-50 pb-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-amber-950 font-heading">
                      {editingCategory ? t('admin_categories_edit') : t('admin_categories_add')}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block">{t('admin_categories_form_name_en')}</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Oils"
                        className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block">{t('admin_categories_form_name_te')}</label>
                      <input
                        type="text"
                        name="nameTe"
                        value={formData.nameTe}
                        onChange={handleInputChange}
                        placeholder="ఉదా: వంట నూనెలు"
                        className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block">{t('admin_categories_form_slug')}</label>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleInputChange}
                        placeholder="e.g. oils"
                        className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block">{t('admin_categories_form_image')}</label>
                      <input
                        type="text"
                        name="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        placeholder="/images/categories/oils.jpg"
                        className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block">{t('admin_categories_form_desc')}</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder={language === 'te' ? 'విభాగం గురించి వివరణ...' : 'Category description...'}
                        rows={2}
                        className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 block">{t('admin_categories_form_sort')}</label>
                        <input
                          type="number"
                          name="sortOrder"
                          value={formData.sortOrder}
                          onChange={handleInputChange}
                          className="w-full bg-amber-50/15 border border-amber-100 rounded-lg p-2.5 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="accent-amber-800"
                        />
                        <label htmlFor="isActive" className="text-[10px] font-bold text-amber-900 cursor-pointer select-none">
                          {t('admin_categories_form_active')}
                        </label>
                      </div>
                    </div>

                    {formError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-650 font-bold flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="flex space-x-3 pt-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-amber-800 text-white py-3 rounded-full font-bold shadow-sm cursor-pointer"
                      >
                        {saving ? t('admin_updating') : t('admin_categories_form_save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 bg-white border border-amber-200 text-amber-950 py-3 rounded-full font-bold cursor-pointer"
                      >
                        {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

          </section>

        </div>
      </main>

          </>
  );
}
