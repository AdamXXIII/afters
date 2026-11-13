// Odd Sock word pairs. Each pair is two concrete things a UK table knows, close enough that a
// one-word clue could fit either ("sand" fits Beach, "towel" fits both). Never food or drink.
// Adults 18+ = grown-up life (money, work, nights out, family admin), never sexual.
// IDS ARE STABLE: they come from the position in each list, so only ever APPEND new pairs.
// AI-generated (Claude, Odd Sock builder, 2026-11-13).

const FAMILY = `
Beach|Swimming pool
Bus|Train
Library|Bookshop
Zoo|Safari park
Cinema|Theatre
Airport|Train station
Museum|Art gallery
Church|Cathedral
Dentist|Doctor's surgery
Tent|Caravan
Bicycle|Motorbike
Ferry|Cruise ship
Helicopter|Aeroplane
Tram|Tube
Scooter|Skateboard
Rowing boat|Canoe
Taxi|Limousine
Dog|Wolf
Lion|Tiger
Horse|Donkey
Owl|Bat
Penguin|Puffin
Bee|Wasp
Spider|Scorpion
Dolphin|Shark
Rabbit|Hamster
Squirrel|Hedgehog
Seagull|Pigeon
Butterfly|Moth
Snail|Slug
Fox|Badger
Swan|Goose
Camel|Llama
Giraffe|Zebra
Elephant|Rhino
Parrot|Budgie
Frog|Newt
Fridge|Freezer
Hoover|Mop
Washing machine|Dishwasher
Sofa|Armchair
Bed|Hammock
Pillow|Duvet
Shower|Bath
Candle|Torch
Lamp|Fairy lights
Clock|Watch
Radio|Podcast
Television|Laptop
Phone|Tablet
Umbrella|Raincoat
Scarf|Tie
Gloves|Mittens
Wellies|Trainers
Slippers|Flip-flops
Sunglasses|Goggles
Hat|Helmet
Backpack|Suitcase
Wallet|Handbag
Key|Padlock
Pen|Pencil
Ruler|Tape measure
Hammer|Spanner
Ladder|Stairs
Lift|Escalator
Door|Gate
Fence|Hedge
Garden|Park
Shed|Garage
Lawnmower|Hedge trimmer
Wheelbarrow|Shopping trolley
Wedding|Christening
Christmas|Easter
Halloween|Bonfire Night
Football|Rugby
Tennis|Badminton
Golf|Crazy golf
Snooker|Darts
Skiing|Snowboarding
Bowling|Curling
Karaoke|Disco
Concert|Festival
Marathon|Parkrun
Yoga|Pilates
Boxing|Wrestling
Cricket|Baseball
Chess|Draughts
Monopoly|Cluedo
Jigsaw|Crossword
Kite|Frisbee
Trampoline|Bouncy castle
Rollercoaster|Ferris wheel
Pantomime|Circus
Magician|Clown
Fireworks|Sparklers
Sandcastle|Snowman
Nurse|Vet
Firefighter|Paramedic
Police officer|Traffic warden
Postman|Delivery driver
Pilot|Astronaut
Plumber|Electrician
Hairdresser|Barber
Lifeguard|Coastguard
Footballer|Referee
Judge|Lawyer
Farmer|Gardener
Optician|Pharmacist
DJ|Radio presenter
Weather presenter|Newsreader
Taxi driver|Bus driver
Window cleaner|Painter and decorator
Security guard|Bouncer
Tour guide|Flight attendant
Snow|Hail
Rain|Fog
Thunder|Lightning
Rainbow|Sunset
Volcano|Earthquake
River|Canal
Mountain|Hill
Forest|Jungle
Cave|Tunnel
Waterfall|Fountain
Moon|Sun
Star|Planet
Pond|Puddle
Guitar|Ukulele
Drum|Tambourine
Violin|Cello
Trumpet|Trombone
Recorder|Harmonica
Book|Magazine
Letter|Postcard
Email|Text message
Map|Satnav
Camera|Binoculars
Telescope|Microscope
Balloon|Bubble
Crown|Tiara
Wand|Broomstick
Pirate|Viking
Knight|Soldier
King|President
Ghost|Zombie
Vampire|Werewolf
Witch|Wizard
Dragon|Dinosaur
Robot|Alien
Mermaid|Fairy
Tooth Fairy|Father Christmas
Superman|Batman
Star Wars|Star Trek
Mario|Sonic
Lego|Playmobil
Teddy bear|Doll
Paddington|Winnie the Pooh
EastEnders|Coronation Street
Strictly|The X Factor
Disneyland|Legoland
Blackpool|Brighton
London|Paris
Scotland|Wales
Spain|Portugal
Italy|Greece
New York|Las Vegas
Australia|New Zealand
Iceland|Norway
Big Ben|The London Eye
Stonehenge|The Pyramids
Pyjamas|Dressing gown
Swimsuit|Wetsuit
Jumper|Hoodie
Suit|Tuxedo
Wedding dress|Ballgown
Earrings|Necklace
Glasses|Contact lenses
Roundabout|Traffic lights
Car park|Multi-storey
Petrol station|Car wash
Hotel|B&B
School|University
Playground|Skate park
Office|Classroom
Supermarket|Corner shop
Market|Car boot sale
Post office|Bank
Launderette|Dry cleaner
Stadium|Arena
Bowling alley|Arcade
Ice rink|Roller disco
Spa|Sauna
Theme park|Fairground
Water park|Lido
Lighthouse|Windmill
Castle|Palace
Bridge|Pier
Igloo|Treehouse
Statue|Scarecrow
Hot air balloon|Parachute
Submarine|Speedboat
Quad bike|Go-kart
Tractor|Digger
Ambulance|Fire engine
Ice skates|Roller skates
Hula hoop|Skipping rope
Paintbrush|Crayon
Stapler|Sellotape
Calculator|Abacus
Piggy bank|Cash machine
Toothbrush|Hairbrush
Hairdryer|Straighteners
Alarm clock|Doorbell
Remote control|Game controller
Bunk bed|Sofa bed
Bin|Recycling box
Plaster|Bandage
Thermometer|Stethoscope
Wheelchair|Crutches
`;

const ADULT = `
Hangover|Jet lag
Payday|Pension
Mortgage|Rent
Overdraft|Credit card
Tax return|Parking fine
Divorce|Breakup
Stag do|Hen do
Night out|House party
Pub quiz|Karaoke night
Taxi queue|Night bus
Group chat|Email chain
Zoom call|Team meeting
Office Christmas party|Wedding reception
Appraisal|Job interview
Boss|Landlord
Redundancy|Resignation
Monday morning|Sunday night
Commute|School run
In-laws|Neighbours
Parents' evening|Job interview
Funeral|Christening
Will|Prenup
Midlife crisis|Retirement
Sports car|Motorbike
Tattoo|Piercing
Speeding ticket|Parking ticket
Breathalyser|Lie detector
Casino|Bookies
Lottery ticket|Scratchcard
Poker|Blackjack
Payday loan|Pawn shop
Bailiff|Debt collector
IKEA|B&Q
Sunburn|Hangover
Lads' holiday|Girls' trip
Ibiza|Magaluf
Benidorm|Blackpool
Cruise|All-inclusive
Airport lounge|Duty free
Hand luggage|Hold luggage
Delayed flight|Cancelled train
Rail replacement bus|Night bus
Smart meter|Boiler
Boiler|Damp
Estate agent|Car salesman
Council tax|TV licence
HMRC|DVLA
Jury service|Speed awareness course
Driving test|Job interview
A&E|Walk-in centre
Therapist|Life coach
Self-checkout|Cash machine
Phone contract|Gym membership
Unfollow|Block
Voicemail|Read receipt
Wedding speech|Eulogy
Best man|Godparent
Divorce lawyer|Estate agent
Funeral|Wake
Mid-life crisis|Quarter-life crisis
Grey hair|Reading glasses
Hot tub|Sauna
Smoking area|Pub garden
Vape|Cigarette
Lock-in|After-party
Bouncer|Bar staff
Bank holiday|Sick day
Rent day|Payday
Credit score|Overdraft
Unpaid invoice|Parking fine
Spreadsheet|PowerPoint
Out of office|Sick day
Reply all|Group chat
Performance review|School report
Middle manager|Head teacher
HR|Head teacher's office
Leaving do|Retirement party
Secret Santa|Office raffle
Team-building day|School trip
Hot desk|Open-plan office
LinkedIn|Facebook
Instagram|TikTok
Netflix|YouTube
Wetherspoons|Premier Inn
Primark|Poundland
Argos|eBay
Speed camera|Traffic warden
Neighbours' party|Barking dog
Toddler|Teenager
Nursery fees|Mortgage
Wedding list|Christening present
Hen do|Wedding
Stag do|Lads' holiday
Pub crawl|Wedding reception
Taxi home|Walk home
Phone at 1%|Lost wallet
Kicking-out time|Last orders
Bar tab|Round
Dance floor|Smoking area
Hungover Sunday|Bank holiday Monday
6am alarm|Monday morning
Ex|Old boss
Mother-in-law|Landlady
Family WhatsApp|Work WhatsApp
Christmas with the in-laws|Christmas at work
Flat-pack wardrobe|Self-assessment
Wedding seating plan|Office rota
First day at work|Job interview
Stag do in Prague|Hen do in Dublin
Glastonbury|Download
Festival toilet|Train toilet
Mosh pit|Dance floor
Sat nav|Back-seat driver
MOT|Dentist check-up
Wedding fund|House deposit
House deposit|Pension
Student loan|Car loan
Gap year|Career break
Payslip|Bank statement
Overtime|Night shift
Night shift|Hangover
Freelancer|Contractor
Startup|Side hustle
Crypto|Premium Bonds
Stock market|Bookies
Landlord|Letting agent
Moving house|Divorce
Removal van|Skip
Car boot sale|eBay
Neighbour from hell|Flatmate from hell
Flatmate|Lodger
Wedding DJ|Karaoke host
Fancy dress party|Murder mystery night
Escape room|Pub quiz
Paintball|Laser tag
Golf day|Spa day
Football manager|Head teacher
Referee|Traffic warden
Tax man|Bailiff
Jobcentre|Post office queue
GP waiting room|Airport gate
Fire alarm test|Car alarm
Smoke alarm|Baby monitor
`;

const parse = (txt, pre) => txt.trim().split('\n').map((line, i) => {
  const [a, b] = line.split('|').map((s) => s.trim());
  return { id: `${pre}${String(i + 1).padStart(3, '0')}`, a, b };
});

export const PAIRS = { family: parse(FAMILY, 'f'), adult: parse(ADULT, 'a') };
