import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SuperAdminCrm = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetchApi('/super-admin/tenants');
        setTenants(response || []); // API returns a raw array
      } catch (err) {
        setError(err.message);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Super Admin CRM</h1>
      <div className="bg-card p-4 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant._id}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.contactInfo?.email}</TableCell>
                <TableCell>{tenant.contactInfo?.phone}</TableCell>
                <TableCell>{tenant.subscriptionPlan}</TableCell>
                <TableCell><Badge variant={tenant.status === 'active' ? 'default' : 'destructive'}>{tenant.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SuperAdminCrm;
