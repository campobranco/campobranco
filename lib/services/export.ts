import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logActivity } from './audit_logs';

export async function exportDataToCSV(congregationId: string, cityId?: string | null, territoryId?: string | null) {
    if (!congregationId) {
        throw new Error('Congregação não informada');
    }

    try {
        let addrQuery = query(collection(db, 'addresses'), where('congregationId', '==', congregationId));

        const territoryMap: Record<string, any> = {};
        const cityMap: Record<string, any> = {};

        if (territoryId) {
            addrQuery = query(addrQuery, where('territoryId', '==', territoryId));
            
            const tDoc = await getDoc(doc(db, 'territories', territoryId));
            if (tDoc.exists()) {
                territoryMap[tDoc.id] = { id: tDoc.id, ...tDoc.data() };
                if (tDoc.data().cityId) {
                    const cDoc = await getDoc(doc(db, 'cities', tDoc.data().cityId));
                    if (cDoc.exists()) cityMap[cDoc.id] = { id: cDoc.id, ...cDoc.data() };
                }
            }
        } else if (cityId) {
            addrQuery = query(addrQuery, where('cityId', '==', cityId));
            
            const cDoc = await getDoc(doc(db, 'cities', cityId));
            if (cDoc.exists()) cityMap[cDoc.id] = { id: cDoc.id, ...cDoc.data() };
            
            const tQ = query(collection(db, 'territories'), where('cityId', '==', cityId));
            const tSnap = await getDocs(tQ);
            tSnap.docs.forEach(d => territoryMap[d.id] = { id: d.id, ...d.data() });
        } else {
            const cQ = query(collection(db, 'cities'), where('congregationId', '==', congregationId));
            const cSnap = await getDocs(cQ);
            cSnap.docs.forEach(d => cityMap[d.id] = { id: d.id, ...d.data() });

            const tQ = query(collection(db, 'territories'), where('congregationId', '==', congregationId));
            const tSnap = await getDocs(tQ);
            tSnap.docs.forEach(d => territoryMap[d.id] = { id: d.id, ...d.data() });
        }

        const addrSnap = await getDocs(addrQuery);
        const addresses = addrSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        const rowsData: any[] = [];
        const validCityIds = Object.keys(cityMap);
        const validTerritoryIds = Object.keys(territoryMap);
        const usedAddresses = new Set<string>();

        for (const cid of validCityIds) {
            const city = cityMap[cid];
            const cityTerritories = validTerritoryIds.filter(tid => territoryMap[tid].cityId === cid);

            if (cityTerritories.length === 0) {
                rowsData.push({ city, territory: null, address: null });
            } else {
                for (const tid of cityTerritories) {
                    const territory = territoryMap[tid];
                    const territoryAddresses = addresses.filter(a => a.territoryId === tid);

                    if (territoryAddresses.length === 0) {
                        rowsData.push({ city, territory, address: null });
                    } else {
                        for (const address of territoryAddresses) {
                            usedAddresses.add(address.id);
                            rowsData.push({ city, territory, address });
                        }
                    }
                }
            }
        }

        // Add any orphaned addresses just in case
        for (const address of addresses) {
            if (!usedAddresses.has(address.id)) {
                const city = cityMap[address.cityId] || null;
                const territory = territoryMap[address.territoryId] || null;
                rowsData.push({ city, territory, address });
            }
        }

        rowsData.sort((a, b) => {
            const cityNameA = a.city?.name || '';
            const cityNameB = b.city?.name || '';
            const cityComp = cityNameA.localeCompare(cityNameB);
            if (cityComp !== 0) return cityComp;

            const terrNameA = a.territory?.name || '';
            const terrNameB = b.territory?.name || '';
            const numA = parseInt(terrNameA, 10);
            const numB = parseInt(terrNameB, 10);
            
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                return numA - numB;
            }
            const terrComp = terrNameA.localeCompare(terrNameB);
            if (terrComp !== 0) return terrComp;

            const orderA = a.address?.sortOrder || 0;
            const orderB = b.address?.sortOrder || 0;
            if (orderA !== orderB) return orderA - orderB;

            const addrNameA = a.address?.street || '';
            const addrNameB = b.address?.street || '';
            return addrNameA.localeCompare(addrNameB);
        });

        const headers = [
            'Cidade', 'UF', 'Número do Mapa', 'Descrição', 'Endereço',
            'Quantidade de residentes', 'Nome', 'Link do Maps', 'Link do Waze',
            'Status', 'Surdo', 'Menor de idade', 'Estudante', 'Neurodivergente',
            'Gênero', 'Observações', 'Resultado da ultima visita', 'Ordem na listagem'
        ];

        const rows = rowsData.map((row) => {
            const city = row.city || { name: '', uf: '' };
            const territory = row.territory || { name: '', notes: '' };
            const addr = row.address || {};

            return [
                city.name || '',
                city.uf || '',
                territory.name || '',
                territory.notes || '',
                addr.street || '',
                row.address ? (addr.residentsCount || 1) : '',
                addr.residentName || '',
                addr.googleMapsLink || '',
                addr.wazeLink || '',
                row.address ? ((addr.isActive ?? true) ? 'true' : 'false') : '',
                row.address ? (addr.isDeaf ? 'true' : 'false') : '',
                row.address ? (addr.isMinor ? 'true' : 'false') : '',
                row.address ? (addr.isStudent ? 'true' : 'false') : '',
                row.address ? (addr.isNeurodivergent ? 'true' : 'false') : '',
                addr.gender || '',
                addr.observations || '',
                addr.lastVisitResult || '',
                row.address ? (addr.sortOrder || 0) : ''
            ];
        });

        const csvContent = "\uFEFF" + [
            headers.join(';'),
            ...rows.map(row => row.map(cell => {
                const str = String(cell).replace(/"/g, '""');
                return str.includes(';') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
            }).join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exportacao_${territoryId ? 'territorio' : cityId ? 'cidade' : 'congregacao'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        logActivity({
            level: 'INFO',
            category: 'REPORTS',
            action: 'TERRITORY_EXPORT',
            message: `TERRITORY_EXPORT: Exportação de dados territoriais em CSV (${addresses.length} endereços)`,
            congregationId,
            metadata: {
                format: 'CSV',
                entity: 'territories',
                totalAddresses: addresses.length,
                cityIdFilter: cityId || null,
                territoryIdFilter: territoryId || null
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error exporting data:", error);
        return { success: false, error: error.message };
    }
}
