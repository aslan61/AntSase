# AntSase 3D

PDF saha planlarına göre modellenmiş, Excel’den şase yerleştiren etkileşimli 3B otopark uygulaması. Saha 1 (832) ve Saha 2 (410) yan yana, bağımsız alanlar olarak gösterilir.

3B sahnede varsayılan `Taşı` modu sol fare veya tek parmakla yatay/dikey hareket ettirir; `Döndür` modu aynı hareketi kamera dönüşüne çevirir. Sağ fare ters işlemi, tekerlek veya iki parmak yakınlaştırmayı kontrol eder. Arayüz telefonlarda tek sütunlu ve dokunmatik kullanıma uygundur.

## Çalıştırma

```bash
npm install
npm run dev:web
```

Tarayıcıda `http://127.0.0.1:5173` adresini açın. GitHub Pages sürümü yalnız-frontend çalışır ve son kaydı tarayıcıda saklar.

## Excel biçimi

| ŞASİ | ADRES |
|---|---|
| WDD00000000000001 | A3 |
| WDD00000000000002 | H10 |
| WDD00000000000003 | N12 |

`ŞASİ + ADRES` biçimi doğrudan desteklenir. `H10` otomatik olarak H harfi ve 10. perona ayrılır; aynı adresi kullanan araçlar peronun derinlik karelerine sırayla dizilir. Ayrı `Harf` ve `Peron Numara` sütunları da kullanılabilir. PDF planında bulunmayan adresler başka yere zorlanmaz, uyarı panelinde gösterilir.

Denemek için [örnek CSV](./examples/sase-yerlesim-ornek.csv) doğrudan uygulamaya bırakılabilir.

## Doğrulama ve yayın

```bash
npm test
npm run build:pages
```

Depoyu GitHub’a gönderip **Settings → Pages → Source: GitHub Actions** seçildiğinde `.github/workflows/deploy-pages.yml` otomatik yayın yapar.

Ürünü başka bir üretici ajanla yeniden oluşturmak veya genişletmek için [PROMPT.md](./PROMPT.md) dosyasındaki ayrıntılı prompt kullanılabilir.
