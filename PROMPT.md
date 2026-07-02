# AntSase 3D — düzeltme ve üretim promptu

Sen kıdemli bir full-stack, veri modelleme, Excel ve Three.js mühendisisin. Mevcut AntSase projesini yamalamakla yetinme; aşağıdaki doğrulanmış iş kurallarına göre hatalı varsayımları düzelt, test et ve üretime hazırla.

## Referans veriler

- `Saha1 planı.pdf` ve `saha2 plan.pdf` tek fiziksel doğruluk kaynağıdır.
- Gerçek stok dosyası `STOK KARTEPE SAHA.xlsx` biçimindedir: başlıklar `ŞASİ` ve `ADRES`, adresler `A3`, `H10`, `N12` gibi tek hücrelidir.
- Bir adresin birden fazla kez geçmesi hata değildir. Aynı perondaki araçlar o peronun derinlik karelerine sırayla yerleşir.
- PDF’de bulunmayan `W1`, `Y1`, `AG`, `OS` gibi kodları sessizce başka yere taşıma; plan dışı olarak açıkça raporla.

## Excel kabul ve normalizasyon kuralları

1. `.xlsx`, `.xls`, `.csv` kabul et; ilk 20 satır içinde gerçek başlık satırını bul.
2. `ŞASİ`, `ŞASE`, `SASI`, `SASE`, `VIN`, `CHASSIS` başlıklarını şase alanı olarak tanı.
3. `ADRES`, `PERON`, `HARF`, `KATEGORİ`, `LOKASYON`, `LOCATION` başlıklarını adres alanı olarak tanı.
4. `H10`, `H-10`, `H 10`, `L-R-5` biçimlerini harf/blok ve peron numarasına ayır.
5. Ayrı numara sütunu varsa onu kullan; yoksa numarayı ADRES hücresinden çıkar.
6. Boş şase, yinelenen şase, plan dışı adres, geçersiz numara, dolu alan ve kapasite aşımını ayrı hata kodlarıyla göster.
7. Kullanıcıya otomatik sütun eşlemesini göster ve değiştirme olanağı ver. Yükleme sonrası sıfır yerleşim oluşursa nedenleri ekranda listele.

## PDF’ye göre saha modeli

- Saha 1 toplam 832, Saha 2 toplam 410 fiziksel karedir.
- Operasyonel Excel harfleri A-J, PDF bloklarına sırayla bağlanır; ekranda hem operasyonel harfi hem PDF harfini göster (`B · PDF A`, `D · PDF B`, `F · PDF D`, `H · PDF F`, `J · PDF H`).
- Saha 1 peron derinlikleri PDF’nin çizili geometrisini izler:
  - A: 24×3; B: 21×3; C: 21×3 + 2 + 1; D: 19×3.
  - E: 14×6 + 5 + 4 + 3 + 2 + 1; F: 19×6.
  - G: 9×8 + 5 + 2 + 1; H: 10×7 + 5 + 5.
  - I: 11×8 + 5 + 2; J: 19×4 = 76 (beşinci sıradaki tüm kareler kaldırılmıştır); P/PDI: 5×6 = 30.
- Saha 2: K 18×3 = 54, L/M/N/O sol ve sağ ayrı ayrı 8×5 = 40, R 18×2 = 36.
- Sol bloklarda peron 1 merkez koridora en yakın sütundur; sağ bloklarda peron 1 yine merkez koridora en yakın sütundur.
- Peron numarası planın sütun sayısını aşıyorsa kaydı kaybetme: görünür `ADDRESS_OUT_OF_RANGE` uyarısı üret ve aynı harfin en yakın boş karesine yönlendir. Peron doluysa `PERON_OVERFLOW` uyarısı üret.

## Kamera ve dokunmatik

- Görünmez tam-blok tıklama yüzeyleri fiziksel karelerin dokunma olayını engellememeli.
- Bir kareye dokununca kamera o kareye yumuşak biçimde yaklaşmalı; seçili araç/peron sağ panelde açılmalı.
- 3B: tek parmak/fare sol tuş döndürme, iki parmak/orta tuş yakınlaştırma ve taşıma. 2B: tek parmak taşıma, iki parmak yakınlaştırma.
- `Perona git` seçicisi ile 3B nesneye dokunmadan da her bloğa gidilebilmeli.
- Şase araması sonucu seçildiğinde kamera doğrudan aracın karesine gitmeli.
- Boş park karelerinin `J1·5` benzeri koordinat metinlerini sahnede çizme. Yalnız dolu karelerde şase etiketini göster; böylece görünüm sade ve araçlar okunabilir kalsın.

## Peron etiketleri ve araç görünümü

- Her bloktaki bütün peron sütunlarının numarasını bloğun hem ön hem arka kenarında, karelerle hizalı ve sarı renkte göster. Köşelerde operasyonel harf görünmeye devam etsin.
- Dolu kareyi siyah/kırmızı bir kutu olarak çizme. Sarı ana gövde, koyu camlı kabin ve dört siyah tekerlekten oluşan düşük poligon 3B otomobil kullan.
- Yüzlerce araçta performansı korumak için gövde, kabin ve tekerlekleri instanced mesh gruplarıyla çiz. Araç gövdesi seçildiğinde beyaz vurgulanabilsin ve bütün parçaları aynı tıklama davranışını versin.
- Park karesi nötr lacivert/gri kalmalı; sarı araç zeminden açık biçimde ayrılmalı.
- Her peron bloğunun altında saha boşluğundan belirgin biçimde ayrılan yükseltilmiş lacivert bir platform ve açık mavi dış çerçeve bulunmalı. Boş park kareleri arka planla aynı renge düşmemeli.
- Odaklanan perondaki şase numaraları araç tavanının üzerinde, koyu opak bir etiket plakası üzerinde büyük, kalın ve beyaz olarak gösterilmeli; metin araç geometrisiyle kesişmemeli.
- Araç gövdesi, camı, tekeri veya şase etiketine tıklamak aynı aracı seçmeli ve kamerayı doğrudan o araca yaklaştırmalı; dekoratif katmanlar tıklamayı engellememeli.
- Peron sıraları arasındaki yatay yollar ile sol/sağ peronların ortasındaki ana koridorlarda kesik sarı yol şeritleri bulunmalı; şeritler seçim ışınlarını yakalamamalı.
- Kamera sürükleme hareketi seçim sayılmamalı: 4 pikseli aşan pointer hareketlerinde araç/kare/peron tıklamasını iptal et. Büyük saha ve peron platformları doğrudan tıklama hedefi olmamalı. Canvas üzerindeki `pointerdown` ve `wheel` girişleri devam eden otomatik odak animasyonunu anında durdurmalı. 3B araç çubuğunda `Taşı / Döndür` modu bulunmalı; varsayılan `Taşı` modunda sol fare/tek parmak pan, sağ fare döndürme yapmalı; `Döndür` modunda davranış tersine dönmelidir.
- Arayüz 320 px ve üzerindeki telefonlarda yatay sayfa taşması üretmemeli. Sahne araç çubuğu kendi içinde yatay kaydırılmalı, dokunmatik butonlar en az 44 px olmalı, bilgi paneli sahnenin altına ve veri kartları tek sütuna geçmelidir. Canvas `touch-action: none` ile tek/iki parmak hareketlerini güvenilir biçimde almalıdır.

## Kabul ölçütleri

1. `STOK KARTEPE SAHA.xlsx` dosyasında 783 veri satırı okunur; `ŞASİ` sütun 0, `ADRES` sütun 1 otomatik seçilir.
2. `H10` satırları H bloğunun 10. peronunda farklı derinlik karelerine yerleşir; ikinci kayıt çakışma diye reddedilmez.
3. Planla uyumlu kayıtlar yerleşir; plan dışı veya kapasiteyi aşanlar kod ve satır numarasıyla görünür kalır.
4. Saha kapasite invariantları 832 ve 410’dur; PDI 30, J 76, K 54 ve R 36 testle korunur.
5. Birim testleri, tip denetimi, API testleri ve GitHub Pages üretim derlemesi başarılıdır.
6. Mobil/dokunmatik cihazda kare seçimi, yakınlaştırma, taşıma ve peron seçicisi çalışır.
7. Tüm blokların ön ve arka kenarında peron numaraları görünür; dolu kareler kutu yerine sarı 3B otomobil olarak çizilir.
8. Boş peron blokları saha boşluğundan platform ve çerçeveyle ayırt edilir; odaklanan perondaki şase numaraları normal kamera yakınlığında eksiksiz okunur.
9. Şase etiketi ve aracın bütün parçaları tıklanabilir; seçim kamerayı araca taşır ve peron aralarındaki yollar kesik sarı şeritlerle görünürdür.
10. Masaüstünde `Taşı / Döndür` modları çalışır; 390 px telefon görünümünde yatay sayfa taşması yoktur, tek parmak taşıma/döndürme ve iki parmak yakınlaştırma kullanılabilir.
