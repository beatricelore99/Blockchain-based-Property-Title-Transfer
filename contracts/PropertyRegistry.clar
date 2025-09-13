(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PROPERTY-EXISTS u101)
(define-constant ERR-INVALID-HASH u102)
(define-constant ERR-INVALID-ID u103)
(define-constant ERR-INVALID-DESCRIPTION u104)
(define-constant ERR-INVALID-ADDRESS u105)
(define-constant ERR-INVALID-TIMESTAMP u106)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u107)
(define-constant ERR-INVALID-OWNER u108)
(define-constant ERR-PROPERTY-NOT-FOUND u109)
(define-constant ERR-INVALID-UPDATE-PARAM u110)
(define-constant ERR-MAX-PROPERTIES-EXCEEDED u111)
(define-constant ERR-INVALID-STATUS u112)
(define-constant ERR-INVALID-LOCATION u113)
(define-constant ERR-INVALID-CURRENCY u114)
(define-constant ERR-INVALID-SIZE u115)
(define-constant ERR-INVALID-ZONING u116)
(define-constant ERR-INVALID-TAX-ID u117)
(define-constant ERR-INVALID-ASSESSMENT u118)
(define-constant ERR-INVALID-LIEN u119)
(define-constant ERR-INVALID-MORTGAGE u120)

(define-data-var next-property-id uint u0)
(define-data-var max-properties uint u10000)
(define-data-var registration-fee uint u5000)
(define-data-var authority-contract (optional principal) none)

(define-map properties
  uint
  {
    owner: principal,
    legal-description: (string-utf8 512),
    document-hash: (buff 32),
    address: (string-utf8 256),
    registered-at: uint,
    location: (string-utf8 128),
    currency: (string-utf8 20),
    status: bool,
    size-sqft: uint,
    zoning-type: (string-utf8 50),
    tax-id: (string-utf8 100),
    assessment-value: uint,
    has-lien: bool,
    lien-amount: uint,
    has-mortgage: bool,
    mortgage-amount: uint
  }
)

(define-map properties-by-hash
  (buff 32)
  uint)

(define-map property-updates
  uint
  {
    update-description: (string-utf8 512),
    update-address: (string-utf8 256),
    update-timestamp: uint,
    updater: principal,
    update-size-sqft: uint,
    update-zoning-type: (string-utf8 50)
  }
)

(define-read-only (get-property (id uint))
  (map-get? properties id)
)

(define-read-only (get-property-updates (id uint))
  (map-get? property-updates id)
)

(define-read-only (is-property-registered (hash (buff 32)))
  (is-some (map-get? properties-by-hash hash))
)

(define-private (validate-owner (owner principal))
  (if (not (is-eq owner 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-OWNER))
)

(define-private (validate-legal-description (desc (string-utf8 512)))
  (if (and (> (len desc) u0) (<= (len desc) u512))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-document-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-address (addr (string-utf8 256)))
  (if (and (> (len addr) u0) (<= (len addr) u256))
      (ok true)
      (err ERR-INVALID-ADDRESS))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-location (loc (string-utf8 128)))
  (if (and (> (len loc) u0) (<= (len loc) u128))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-size-sqft (size uint))
  (if (> size u0)
      (ok true)
      (err ERR-INVALID-SIZE))
)

(define-private (validate-zoning-type (zoning (string-utf8 50)))
  (if (or (is-eq zoning "residential") (is-eq zoning "commercial") (is-eq zoning "industrial"))
      (ok true)
      (err ERR-INVALID-ZONING))
)

(define-private (validate-tax-id (tid (string-utf8 100)))
  (if (and (> (len tid) u0) (<= (len tid) u100))
      (ok true)
      (err ERR-INVALID-TAX-ID))
)

(define-private (validate-assessment-value (val uint))
  (if (> val u0)
      (ok true)
      (err ERR-INVALID-ASSESSMENT))
)

(define-private (validate-lien-amount (amt uint))
  (if (>= amt u0)
      (ok true)
      (err ERR-INVALID-LIEN))
)

(define-private (validate-mortgage-amount (amt uint))
  (if (>= amt u0)
      (ok true)
      (err ERR-INVALID-MORTGAGE))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-owner contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-properties (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-PROPERTIES-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-properties new-max)
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (register-property
  (legal-description (string-utf8 512))
  (document-hash (buff 32))
  (address (string-utf8 256))
  (location (string-utf8 128))
  (currency (string-utf8 20))
  (size-sqft uint)
  (zoning-type (string-utf8 50))
  (tax-id (string-utf8 100))
  (assessment-value uint)
  (lien-amount uint)
  (mortgage-amount uint)
)
  (let (
        (next-id (var-get next-property-id))
        (current-max (var-get max-properties))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-PROPERTIES-EXCEEDED))
    (try! (validate-legal-description legal-description))
    (try! (validate-document-hash document-hash))
    (try! (validate-address address))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-size-sqft size-sqft))
    (try! (validate-zoning-type zoning-type))
    (try! (validate-tax-id tax-id))
    (try! (validate-assessment-value assessment-value))
    (try! (validate-lien-amount lien-amount))
    (try! (validate-mortgage-amount mortgage-amount))
    (asserts! (is-none (map-get? properties-by-hash document-hash)) (err ERR-PROPERTY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get registration-fee) tx-sender authority-recipient))
    )
    (map-set properties next-id
      {
        owner: tx-sender,
        legal-description: legal-description,
        document-hash: document-hash,
        address: address,
        registered-at: block-height,
        location: location,
        currency: currency,
        status: true,
        size-sqft: size-sqft,
        zoning-type: zoning-type,
        tax-id: tax-id,
        assessment-value: assessment-value,
        has-lien: (> lien-amount u0),
        lien-amount: lien-amount,
        has-mortgage: (> mortgage-amount u0),
        mortgage-amount: mortgage-amount
      }
    )
    (map-set properties-by-hash document-hash next-id)
    (var-set next-property-id (+ next-id u1))
    (print { event: "property-registered", id: next-id })
    (ok next-id)
  )
)

(define-public (update-property
  (property-id uint)
  (update-description (string-utf8 512))
  (update-address (string-utf8 256))
  (update-size-sqft uint)
  (update-zoning-type (string-utf8 50))
)
  (let ((property (map-get? properties property-id)))
    (match property
      p
        (begin
          (asserts! (is-eq (get owner p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-legal-description update-description))
          (try! (validate-address update-address))
          (try! (validate-size-sqft update-size-sqft))
          (try! (validate-zoning-type update-zoning-type))
          (map-set properties property-id
            {
              owner: (get owner p),
              legal-description: update-description,
              document-hash: (get document-hash p),
              address: update-address,
              registered-at: (get registered-at p),
              location: (get location p),
              currency: (get currency p),
              status: (get status p),
              size-sqft: update-size-sqft,
              zoning-type: update-zoning-type,
              tax-id: (get tax-id p),
              assessment-value: (get assessment-value p),
              has-lien: (get has-lien p),
              lien-amount: (get lien-amount p),
              has-mortgage: (get has-mortgage p),
              mortgage-amount: (get mortgage-amount p)
            }
          )
          (map-set property-updates property-id
            {
              update-description: update-description,
              update-address: update-address,
              update-timestamp: block-height,
              updater: tx-sender,
              update-size-sqft: update-size-sqft,
              update-zoning-type: update-zoning-type
            }
          )
          (print { event: "property-updated", id: property-id })
          (ok true)
        )
      (err ERR-PROPERTY-NOT-FOUND)
    )
  )
)

(define-public (get-property-count)
  (ok (var-get next-property-id))
)

(define-public (check-property-existence (hash (buff 32)))
  (ok (is-property-registered hash))
)