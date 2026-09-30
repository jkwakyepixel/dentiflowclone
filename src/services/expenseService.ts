import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Expense } from '../types';

export const expenseService = {
  async createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
    const expensesRef = collection(db, 'expenses');
    const newDoc = {
      ...expense,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(expensesRef, newDoc);
    return { id: docRef.id, ...newDoc };
  },

  async updateExpense(id: string, updates: Partial<Expense>) {
    const expenseRef = doc(db, 'expenses', id);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(expenseRef, updateData);
  },

  async deleteExpense(id: string) {
    const expenseRef = doc(db, 'expenses', id);
    await updateDoc(expenseRef, {
      isDeleted: true,
      deletedAt: serverTimestamp()
    });
  },

  async getClinicExpenses(clinicId: string) {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef, 
      where('clinicId', '==', clinicId),
      where('isDeleted', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
  }
};
