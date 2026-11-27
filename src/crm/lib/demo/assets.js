// Images bundled with the app, reused as dummy photos for demo records.
import bangkok from '../../assets/thailand_bangkok.jpg';
import chiangmai from '../../assets/thailand_chiangmai.jpg';
import kohsamui from '../../assets/thailand_kohsamui.jpg';
import krabi from '../../assets/thailand_krabi.jpg';
import phiphi from '../../assets/thailand_phiphi.jpg';
import phuket from '../../assets/thailand_phuket.jpg';
import tourHotel from '../../assets/tour_hotel.jpg';
import tourTransfers from '../../assets/tour_transfers.jpg';
import tourPartner from '../../assets/tour_partner.jpg';
import tourQuotation from '../../assets/tour_quotation.jpg';

export const photo = (url, name = 'photo.jpg') => ({ url, name, originalName: name, mimeType: 'image/jpeg' });

export const destinationImages = {
  Bangkok: bangkok,
  'Chiang Mai': chiangmai,
  'Koh Samui': kohsamui,
  Krabi: krabi,
  'Phi Phi': phiphi,
  'Phi Phi Islands': phiphi,
  Phuket: phuket,
  Pattaya: tourHotel,
};

export const stockImages = { bangkok, chiangmai, kohsamui, krabi, phiphi, phuket, tourHotel, tourTransfers, tourPartner, tourQuotation };
