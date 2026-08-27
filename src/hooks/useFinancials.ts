import { useMemo } from 'react';
import { useInvoices } from './useInvoices';
import { usePayments } from './usePayments';

export function useFinancials() {
  const { invoices, loading: invoicesLoading, error: invoicesError } = useInvoices();
  const { payments, loading: paymentsLoading, error: paymentsError } = usePayments();

  const loading = invoicesLoading || paymentsLoading;
  const error = invoicesError || paymentsError;

  const financials = useMemo(() => {
    if (loading || !invoices || !payments) {
      return {
        revenue: 0,
        invoicedRevenue: 0,
        outstanding: 0,
        openInvoicesCount: 0,
        revenueByMethod: [] as { name: string; value: number }[],
        revenueByService: [] as { name: string; value: number }[],
      };
    }

    // Revenue = money actually received (SUM of all payments)
    const revenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Invoiced Revenue = money billed (SUM of all invoices total)
    const invoicedRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    // Outstanding = money owed (SUM of all invoice balances)
    const outstanding = invoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

    const openInvoicesCount = invoices.filter(inv => (Number(inv.balance) || 0) > 0).length;

    // Revenue by Payment Method
    const methodMap: Record<string, number> = {};
    payments.forEach(p => {
      const method = p.paymentMethod || 'Other';
      methodMap[method] = (methodMap[method] || 0) + (Number(p.amount) || 0);
    });
    const revenueByMethod = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

    // Revenue by Service (Approximated from Invoice Items)
    // Note: Since a payment applies to an invoice (not a specific item), 
    // we use the invoiced amount per service to show demand.
    const serviceMap: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.items) {
        inv.items.forEach(item => {
          serviceMap[item.serviceName] = (serviceMap[item.serviceName] || 0) + (Number(item.total) || 0);
        });
      }
    });
    const revenueByService = Object.entries(serviceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort highest first

    return {
      revenue,
      invoicedRevenue,
      outstanding,
      openInvoicesCount,
      revenueByMethod,
      revenueByService
    };
  }, [invoices, payments, loading]);

  return {
    ...financials,
    invoices,
    payments,
    loading,
    error
  };
}
