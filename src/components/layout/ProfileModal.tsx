import React, { useState } from 'react';
import type { AuthUser } from '../../hooks/useAuth';
import { createPortal } from 'react-dom';
import { X, User, Edit, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatDate } from '../../utils/format';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || 'Super Admin',
    email: user?.email || 'admin@travneeds.com',
    phone: '+20 123 456 789',
    department: 'Administration',
    role: 'Admin'
  });

  const handleSave = () => {
    // In real app, this would update the user profile in Supabase
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                My Profile
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center space-x-6 mb-8">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-700 shadow-sm flex-shrink-0">
                <img src="/avatar-male.png" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formData.fullName}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{formData.role}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Member since {formatDate(user?.created_at || new Date().toISOString())}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  disabled={!isEditing}
                />
                <Input
                  label="Email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-4">
                <Input
                  label="Department"
                  value={formData.department}
                  disabled={true}
                />
                <Input
                  label="Role"
                  value={formData.role}
                  disabled={true}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Status
                  </label>
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
