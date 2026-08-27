import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import type { RoleType } from '../config/permissions';
import toast from 'react-hot-toast';

export const useUsers = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const clinicId = userData?.clinicId || 'demo-clinic';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('clinicId', '==', clinicId));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedUsers.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [clinicId]);

  const updateUserRole = async (userId: string, newRole: RoleType) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const addUser = async (name: string, email: string, role: RoleType, password?: string) => {
    try {
      // Create a secondary app to create the user without signing out the current admin
      const { initializeApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
      const { firebaseConfig } = await import('../config/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      // Use a default password if none is provided
      const userPassword = password || 'Welcome123!';
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, userPassword);
      
      // Sign out the secondary app to clean up
      await signOut(secondaryAuth);
      
      // Now add the user to Firestore using the primary db
      const newUser: User = {
        id: userCredential.user.uid,
        name,
        email,
        role,
        clinicId,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', newUser.id), newUser);
      
      setUsers(prev => [...prev, newUser]);
      toast.success(`User ${name} added successfully!`);
      return { success: true, user: newUser };
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.code === 'auth/email-already-in-use') {
         toast.error('A user with this email already exists.');
      } else {
         toast.error(error.message || 'Failed to add user');
      }
      return { success: false, error };
    }
  };

  return { users, loading, fetchUsers, updateUserRole, addUser };
};
