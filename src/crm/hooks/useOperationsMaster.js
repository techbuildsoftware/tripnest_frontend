import useResilientMasterList from './useResilientMasterList';

export default function useOperationsMaster(type) {
  return useResilientMasterList(`/operations-masters/${type}`);
}
