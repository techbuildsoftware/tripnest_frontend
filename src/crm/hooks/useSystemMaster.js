import useResilientMasterList from './useResilientMasterList';

export default function useSystemMaster(type) {
  return useResilientMasterList(`/system-masters/${type}`);
}
