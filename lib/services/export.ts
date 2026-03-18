import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function exportDataToCSV(congregationId: string, cityId?: string | null, territoryId?: string | null) {
    if (!congregationId) {
        throw new Error('Congregação não informada');
    }

    try {
        let addrQuery = query(collection(db, 'addresses'), where('congregationId', '==', congregationId));

        if (territoryId) {
            addrQuery = query(addrQuery, where('territoryId', '==', territoryId));
        } else if (cityId) {
            addrQuery = query(addrQuery, where('cityId', '==', cityId));
        }

        const addrSnap = await getDocs(addrQuery);
        const addresses = addrSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const territoryIds = Array.from(new Set(addresses.map((a: any) => a.territoryId || a.territory_id).filter(Boolean)));
        const cityIds = Array.from(new Set(addresses.map((a: any) => a.cityId || a.city_id).filter(Boolean)));

        const territoryMap: Record<string, any> = {};
        const cityMap: Record<string, any> = {};

        await Promise.all([
            ...territoryIds.map(async (tid: any) => {
                const docSnap = await getDoc(doc(db, 'territories', tid));
                if (docSnap.exists()) territoryMap[tid] = docSnap.data();
            }),
            ...cityIds.map(async (cid: any) => {
                const docSnap = await getDoc(doc(db, 'cities', cid));
                if (docSnap.exists()) cityMap[cid] = docSnap.data();
            })
        ]);

        const headers = [
            'Cidade', 'UF', 'Número do Mapa', 'Descrição', 'Endereço',
            'Quantidade de residentes', 'Nome', 'Link do Maps', 'Link do Waze',
            'Status', 'Surdo', 'Menor de idade', 'Estudante', 'Neurodivergente',
            'Gênero', 'Observações', 'Resultado da ultima visita', 'Ordem na listagem'
        ];

        const rows = addresses.map((addr: any) => {
            const city = cityMap[addr.cityId || addr.city_id] || { name: '', uf: '' };
            const territory = territoryMap[addr.territoryId || addr.territory_id] || { name: '', notes: '' };

            return [
                city.name || '',
                city.uf || '',
                territory.name || '',
                territory.notes || '',
                addr.street || '',
                addr.residentsCount || addr.residents_count || 1,
                addr.residentName || addr.resident_name || '',
                addr.googleMapsLink || addr.google_maps_link || '',
                addr.wazeLink || addr.waze_link || '',
                (addr.isActive ?? addr.is_active) !== false ? 'true' : 'false',
                (addr.isDeaf ?? addr.is_deaf) ? 'true' : 'false',
                (addr.isMinor ?? addr.is_minor) ? 'true' : 'false',
                (addr.isStudent ?? addr.is_student) ? 'true' : 'false',
                addr.isNeurodivergent ? 'true' : 'false',
                addr.gender || '',
                addr.observations || addr.notes || '',
                addr.lastVisitResult || addr.last_visit_result || '',
                addr.sortOrder || addr.sort_order || 0
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

        return { success: true };
    } catch (error: any) {
        console.error("Error exporting data:", error);
        return { success: false, error: error.message };
    }
}
