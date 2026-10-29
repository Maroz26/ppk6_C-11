export const STATUS = { /*Ini informasi status sesi untuk program */
    BELUM: 'Belum',
    DIBUKA: 'Dibuka',
    DITUTUP: 'Ditutup',
};

export const STATUS_LABEL = { /*Ini informasi label status sesi yang terlihat untuk user */
    [STATUS.BELUM]: 'Belum Dibuka',
    [STATUS.DIBUKA]: 'Sedang Dibuka',
    [STATUS.DITUTUP]: 'Ditutup',
};

export const WARNA_STATUS = {
    [STATUS.BELUM]: '#9A7625',
    [STATUS.DIBUKA]: '#087F5B',
    [STATUS.DITUTUP]: '#A64F58',
};

export const STATUS_COLOR = WARNA_STATUS;

export const INITIAL_SESSIONS = [{
    id: '0001',
    namaPrak: 'Praktikum Machine Learning',
    kelas: 'C',
    tanggal: 'Senin, 26 Oct 2026',
    jam : '08:00 - 10:00',
    ruang: 'Lab C1',
    status: STATUS.BELUM,
    dibuka_saat: null,
    ditutup_saat: null,
    attendance: [],
},{
    id: '0002',
    namaPrak: 'Praktikum Quantum Computing',
    kelas: 'C',
    tanggal: 'Selasa, 27 Oct 2026',
    jam : '10:00 - 12:00',
    ruang: 'Lab D',
    status : STATUS.BELUM,
    dibuka_saat: null,
    ditutup_saat: null,
    attendance: [],
},{
    id: '0003',
    namaPrak: "Praktikum Dark Energy & Cosmic Expansion",
    kelas: 'E',
    tanggal: 'Rabu, 28 Oct 2026',
    jam : '08:00 - 10:00',
    ruang: 'Lab C2',
    status : STATUS.BELUM,
    dibuka_saat: null,
    ditutup_saat: null,
    attendance: [],
},{
    id: '0004',
    namaPrak: 'Praktikum NLP',
    kelas: 'D',
    tanggal: 'Rabu, 28 Oct 2026',
    jam : '13:00 - 15:00',
    ruang: 'Lab D',
    status : STATUS.BELUM,
    dibuka_saat: null,
    ditutup_saat: null,
    attendance: [],
},{
    id: '0005',
    namaPrak: 'Praktikum Cybersecurity',
    kelas: 'D',
    tanggal: 'Kamis, 29 Oct 2026',
    jam : '13:00 - 15:00',
    ruang: 'Lab D',
    status : STATUS.BELUM,
    dibuka_saat: null,
    ditutup_saat: null,
    attendance: [],
},{
    id: '0006',
    namaPrak: "Praktikum Warsh an Nāfi'",
    kelas: 'C',
    tanggal: 'Jumat, 30 Oct 2026',
    jam : '13:00 - 15:00',
    ruang: 'Lab B2',
    status : STATUS.BELUM,
    dibuka_saat: null,
    ditutup_saat: null,
    attendance: [],
},
];