import { Session } from '../types';

export type PermissionStatus = 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';

export type PermissionRecord = {
  id: string;
  sessionId: string;
  praktikanId: string;
  nama: string;
  nim: string;
  alasan: string;
  status: PermissionStatus;
  diajukanPada: string;
  diputuskanOleh: string | null;
  diputuskanPada: string | null;
};

export type CreatePermissionInput = Pick<
  PermissionRecord,
  'sessionId' | 'praktikanId' | 'nama' | 'nim' | 'alasan'
>;

type PermissionListener = (permissions: PermissionRecord[]) => void;
type SessionWithCreator = Pick<Session, 'id' | 'dibuatOleh'>;

let permissions: PermissionRecord[] = [];
let permissionSequence = 0;
const listeners = new Set<PermissionListener>();

const publish = () => {
  const snapshot = permissions.map(permission => ({ ...permission }));
  listeners.forEach(listener => listener(snapshot));
};

export const createPermission = async (input: CreatePermissionInput) => {
  const alasan = input.alasan.trim();
  if (!alasan) throw new Error('Alasan izin wajib diisi.');
  if (!input.sessionId || !input.praktikanId) {
    throw new Error('Sesi dan identitas praktikan wajib tersedia.');
  }

  const record: PermissionRecord = {
    ...input,
    alasan,
    id: `permission-${Date.now()}-${permissionSequence++}`,
    status: 'MENUNGGU',
    diajukanPada: new Date().toISOString(),
    diputuskanOleh: null,
    diputuskanPada: null,
  };
  permissions = [record, ...permissions];
  publish();
  return { ...record };
};

export const listenPermissionsByPraktikan = (
  praktikanId: string,
  listener: PermissionListener
) => {
  const notify = (snapshot: PermissionRecord[]) =>
    listener(snapshot.filter(permission => permission.praktikanId === praktikanId));
  listeners.add(notify);
  notify(permissions);
  return () => {
    listeners.delete(notify);
  };
};

export const listenPermissionsForAssistant = (
  assistantId: string,
  sessions: readonly SessionWithCreator[],
  listener: PermissionListener
) => {
  const ownedSessionIds = new Set(
    sessions
      .filter(session => session.dibuatOleh === assistantId)
      .map(session => session.id)
  );
  const notify = (snapshot: PermissionRecord[]) =>
    listener(snapshot.filter(permission => ownedSessionIds.has(permission.sessionId)));
  listeners.add(notify);
  notify(permissions);
  return () => {
    listeners.delete(notify);
  };
};

export const decidePermission = async (
  permissionId: string,
  status: Extract<PermissionStatus, 'DITERIMA' | 'DITOLAK'>,
  assistantId: string
) => {
  if (!assistantId.trim()) throw new Error('Identitas asisten tidak tersedia.');
  const permission = permissions.find(item => item.id === permissionId);
  if (!permission) throw new Error('Pengajuan izin tidak ditemukan.');
  if (permission.status !== 'MENUNGGU') {
    throw new Error('Pengajuan izin ini sudah diputuskan.');
  }

  permissions = permissions.map(item =>
    item.id === permissionId
      ? {
          ...item,
          status,
          diputuskanOleh: assistantId,
          diputuskanPada: new Date().toISOString(),
        }
      : item
  );
  publish();
};
