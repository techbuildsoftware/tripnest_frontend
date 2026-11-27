import useResilientMasterList from './useResilientMasterList';

export default function useSalesMaster(type) {
  return useResilientMasterList(`/sales-masters/${type}`);
}
