import useResilientMasterList from './useResilientMasterList';

export default function useFinanceMaster(type) {
  return useResilientMasterList(`/finance-masters/${type}`);
}
