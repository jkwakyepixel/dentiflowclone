import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { useServices } from '../hooks/useServices';
import { useUsers } from '../hooks/useUsers';
import { usePermissions } from '../hooks/usePermissions';
import { DEFAULT_OPERATIONS } from '../utils/seedOperations';
import { PERMISSION_LABELS, DEFAULT_ROLE_PERMISSIONS, type AppPermission, type RoleType } from '../config/permissions';
import type { ClinicService } from '../types';
import { 
  Building, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Check, 
  X, 
  Users, 
  Upload,
  Image as ImageIcon,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';



export default function Settings() {
  const { userData } = useAuth();
  const { clinicProfile, updateClinicProfile } = useClinic();
  
  const [activeTab, setActiveTab] = useState<'clinic' | 'services' | 'team'>('clinic');
  const { services, loading, addService, editService, removeService } = useServices();
  const [searchTerm, setSearchTerm] = useState('');

  const { users, loading: usersLoading, updateUserRole, addUser } = useUsers();
  const { hasPermission } = usePermissions();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('staff');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    const result = await addUser(newUserName, newUserEmail, newUserRole, newUserPassword);
    setIsAddingUser(false);
    if (result.success) {
      setIsAddUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('staff');
      setNewUserPassword('');
    }
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType>('staff');

  const handleRoleChange = async (userId: string) => {
    await updateUserRole(userId, selectedRole);
    setEditingUserId(null);
  };
  
  // For configuring Role Permissions
  const [editingRolePermissions, setEditingRolePermissions] = useState<RoleType | null>(null);
  const [tempRolePermissions, setTempRolePermissions] = useState<AppPermission[]>([]);

  const openRolePermissionsModal = (role: RoleType) => {
    const perms = clinicProfile.rolePermissions?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    setTempRolePermissions([...perms]);
    setEditingRolePermissions(role);
  };

  const togglePermission = (perm: AppPermission) => {
    if (tempRolePermissions.includes(perm)) {
      setTempRolePermissions(tempRolePermissions.filter(p => p !== perm));
    } else {
      setTempRolePermissions([...tempRolePermissions, perm]);
    }
  };

  const saveRolePermissions = async () => {
    if (!editingRolePermissions) return;
    const currentPermissions = clinicProfile.rolePermissions || {};
    await updateClinicProfile({
      rolePermissions: {
        ...currentPermissions,
        [editingRolePermissions]: tempRolePermissions
      }
    });
    setEditingRolePermissions(null);
  };

  // Clinic profile form state
  const [clinicName, setClinicName] = useState(clinicProfile.name);
  const [clinicPhone, setClinicPhone] = useState(clinicProfile.phone);
  const [clinicEmail, setClinicEmail] = useState(clinicProfile.email);
  const [clinicAddress, setClinicAddress] = useState(clinicProfile.address);
  const [currency, setCurrency] = useState(clinicProfile.currency || 'GH₵ (Ghana Cedi)');
  const [logoPreview, setLogoPreview] = useState<string | null>(clinicProfile.logo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New / Edit Service Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceCategory, setServiceCategory] = useState('General');
  const [serviceDesc, setServiceDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const clinicId = userData?.clinicId || 'demo-clinic';

  useEffect(() => {
    setClinicName(clinicProfile.name);
    setClinicPhone(clinicProfile.phone);
    setClinicEmail(clinicProfile.email);
    setClinicAddress(clinicProfile.address);
    setLogoPreview(clinicProfile.logo);
  }, [clinicProfile]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        toast.success('Logo uploaded! Click "Save Clinic Profile" to apply changes.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Logo removed. Click "Save Clinic Profile" to apply.');
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveClinicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateClinicProfile({
        name: clinicName.trim() || 'Bright Smile Dental Clinic',
        phone: clinicPhone.trim(),
        email: clinicEmail.trim(),
        address: clinicAddress.trim(),
        logo: logoPreview,
        currency
      });
      toast.success('Clinic profile updated successfully');
    } catch (err) {
      toast.error('Failed to update clinic profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingServiceId(null);
    setServiceName('');
    setServicePrice('');
    setServiceCategory('General');
    setServiceDesc('');
    setIsServiceModalOpen(true);
  };

  const handleOpenEdit = (s: ClinicService) => {
    setEditingServiceId(s.id || null);
    setServiceName(s.name);
    setServicePrice(s.price.toString());
    setServiceCategory(s.category || 'General');
    setServiceDesc(s.description || '');
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      toast.error('Service name is required');
      return;
    }
    const priceNum = parseFloat(servicePrice) || 0;

    setSaving(true);
    try {
      if (editingServiceId && !editingServiceId.startsWith('s')) {
        await editService(editingServiceId, {
          name: serviceName.trim(),
          price: priceNum,
          category: serviceCategory,
          description: serviceDesc.trim()
        });
        toast.success('Service updated successfully');
      } else {
        await addService({
          name: serviceName.trim(),
          price: priceNum,
          category: serviceCategory,
          description: serviceDesc.trim()
        });
        toast.success('Service added to catalog');
      }
      setIsServiceModalOpen(false);
    } catch (err) {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await removeService(id);
        toast.success('Service deleted successfully');
      } catch (err) {
        toast.error('Failed to delete service');
      }
    }
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedOperations = async () => {
    if (!window.confirm('This will add default operations to your clinic. Continue?')) return;
    
    setIsSeeding(true);
    let successCount = 0;
    try {
      for (const op of DEFAULT_OPERATIONS) {
        // Simple check to avoid exact duplicates (by name)
        if (!services.some(s => s.name === op.name)) {
          await addService({
            name: op.name,
            price: op.price,
            category: op.category,
            description: ''
          });
          successCount++;
        }
      }
      toast.success(`Successfully added ${successCount} new operations!`);
    } catch (err) {
      toast.error('Failed to seed operations');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredServices = services.filter(s => {
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your clinic configuration, services & pricing catalog, and team.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-slate-100/90 p-1 rounded-2xl gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('clinic')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'clinic'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building size={14} className={activeTab === 'clinic' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Clinic Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'services'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={14} className={activeTab === 'services' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Services & Pricing</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'team'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} className={activeTab === 'team' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Team & Roles</span>
        </button>
      </div>

      {/* Tab 1: Clinic Profile & Logo Upload */}
      {activeTab === 'clinic' && (
        <div className="space-y-6 max-w-3xl">
          <form onSubmit={handleSaveClinicProfile} className="space-y-6">
            {/* Logo Upload Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Clinic Branding & Logo</h2>
                <p className="text-xs text-slate-400 mt-0.5">This logo will be displayed on the app sidebar, invoices, payment receipts, and patient reports.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                {/* Logo Preview box */}
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-2xs">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Clinic Logo" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="mx-auto text-slate-300 mb-1" size={24} />
                      <span className="text-[10px] text-slate-400 font-medium">No logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Actions */}
                <div className="space-y-2 text-xs">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
                    >
                      <Upload size={14} />
                      <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                    </button>

                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 font-semibold px-3 py-2 rounded-xl transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Supported: PNG, JPG, SVG or WebP. Recommended square size: 300x300px.</p>
                </div>
              </div>
            </div>

            {/* Clinic Details Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Clinic Details</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Clinic Name *</label>
                  <input
                    type="text"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={clinicEmail}
                      onChange={(e) => setClinicEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billing Currency</label>
                  <input
                    type="text"
                    readOnly
                    value={currency}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isSavingProfile ? 'Saving Profile...' : 'Save Clinic Profile'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Services & Pricing */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search services by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleSeedOperations}
                disabled={isSeeding}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSeeding ? <div className="w-3 h-3 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" /> : null}
                <span>Seed Operations</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
              >
                <Plus size={16} />
                <span>Add New Service</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 font-medium border-b border-slate-100">
                    <th className="pb-3 font-medium">Service Name</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium text-right">Standard Fee</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredServices.map((service, idx) => (
                    <tr key={service.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">{service.name}</td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {service.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 max-w-sm truncate">{service.description || '—'}</td>
                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        GH₵ {Number(service.price).toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(service)}
                          title="Edit Service"
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id!)}
                          title="Delete Service"
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No services found matching your search. Click "+ Add New Service" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Team */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Clinic Staff & Dentists</h2>
              {userData?.role === 'admin' && (
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  Add User
                </button>
              )}
            </div>
            
            <div className="space-y-3 text-xs">
              {usersLoading ? (
                <p className="text-slate-400">Loading team members...</p>
              ) : users.length === 0 ? (
                <p className="text-slate-400">No team members found.</p>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e293b] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">{user.name || 'Unknown'}</p>
                        <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select 
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as RoleType)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="dentist">Dentist</option>
                            <option value="receptionist">Receptionist</option>
                            <option value="staff">Staff</option>
                          </select>
                          <button onClick={() => handleRoleChange(user.id)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Save</button>
                          <button onClick={() => setEditingUserId(null)} className="text-slate-500 hover:text-slate-700 px-1 text-xs">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize">
                            {user.role || 'staff'}
                          </span>
                          {userData?.role === 'admin' && (
                            <button 
                              onClick={() => { setEditingUserId(user.id); setSelectedRole(user.role as RoleType || 'staff'); }}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded-md transition-colors"
                              title="Edit Role"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Role Permissions Section (Only for Admin) */}
          {userData?.role === 'admin' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-4xl">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Role Permissions Configuration</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['admin', 'manager', 'dentist', 'receptionist', 'staff'] as RoleType[]).map(role => (
                  <div key={role} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 capitalize mb-1">{role}</h3>
                      <p className="text-[11px] text-slate-500 mb-4">
                        {(clinicProfile.rolePermissions?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || []).length} active permissions
                      </p>
                    </div>
                    <button
                      onClick={() => openRolePermissionsModal(role)}
                      className="text-xs font-semibold text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg border border-blue-100 transition-colors w-full"
                    >
                      Configure
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Role Permissions Modal */}
      {editingRolePermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 capitalize">
                {editingRolePermissions} Permissions
              </h2>
              <button 
                onClick={() => setEditingRolePermissions(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {(Object.keys(PERMISSION_LABELS) as AppPermission[]).map(perm => (
                <label key={perm} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-100">
                  <input
                    type="checkbox"
                    checked={tempRolePermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">{PERMISSION_LABELS[perm]}</span>
                </label>
              ))}
              {editingRolePermissions === 'admin' && (
                <p className="text-[10px] text-slate-400 mt-2">Note: It's recommended to leave all permissions enabled for the Admin role.</p>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingRolePermissions(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveRolePermissions}
                className="px-4 py-2 font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs text-xs"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900">Add New User</h2>
              <button 
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Dr. Sarah Jane"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="sarah.jane@clinic.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as RoleType)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="dentist">Dentist</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Initial Password (Optional)</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Defaults to Welcome123!"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-4 py-2 font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingUser && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingServiceId ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button 
                onClick={() => setIsServiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Service / Procedure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Porcelain Veneer, Scaling"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Standard Fee (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Restorative">Restorative</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Orthodontics">Orthodontics</option>
                    <option value="Endodontics">Endodontics</option>
                    <option value="Diagnostic">Diagnostic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Clinical details or procedure notes..."
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
