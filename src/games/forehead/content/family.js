// Bonce family decks (AI-generated content, Claude, 2026-11-13). 14 decks x 64+ cards.
// Bar: Heads Up! (one thing everyone in the room knows, describable or actable in seconds).
// Written for a UK table of 30-somethings. The first three cards of each deck are its examples on
// the deck picker, so they are the most obvious, most "oh, THAT kind of deck" cards.
import { deck } from './deck.js';

export const FAMILY_DECKS = [
  deck('films', 'Blockbusters', 'Films everyone\'s seen', 'film', '#7A1E2C', `
    Titanic|Jurassic Park|Home Alone|Jaws|The Lion King|Star Wars|Mary Poppins|Toy Story|Finding Nemo|Frozen|
    Ghostbusters|Back to the Future|The Wizard of Oz|E.T.|Shrek|Mrs Doubtfire|Love Actually|Grease|Dirty Dancing|
    The Sound of Music|Harry Potter|The Matrix|Rocky|Paddington|Notting Hill|The Full Monty|Pirates of the Caribbean|
    Indiana Jones|Top Gun|Mamma Mia!|Jumanji|Gladiator|The Lord of the Rings|Bridget Jones's Diary|
    Four Weddings and a Funeral|Mean Girls|Legally Blonde|Ghost|The Godfather|Forrest Gump|The Shawshank Redemption|
    Pulp Fiction|Avatar|Barbie|Oppenheimer|The Avengers|Spider-Man|Batman|James Bond|Mission: Impossible|
    Fast & Furious|Twilight|The Hunger Games|Despicable Me|Up|Inside Out|Monsters, Inc.|The Incredibles|Elf|
    Bend It Like Beckham|Billy Elliot|Shaun of the Dead|The Greatest Showman|Free Willy|Babe|Chicken Run`),

  deck('telly', 'Telly', 'TV shows from the sofa', 'tv', '#2F5D7C', `
    EastEnders|Friends|Doctor Who|Coronation Street|The Office|Only Fools and Horses|Gavin & Stacey|
    Strictly Come Dancing|The Great British Bake Off|Love Island|I'm a Celebrity|Big Brother|The X Factor|
    Britain's Got Talent|Top Gear|Blue Peter|Match of the Day|Countdown|Deal or No Deal|
    Who Wants to Be a Millionaire?|The Chase|Pointless|Mastermind|Gladiators|Blind Date|Peep Show|
    The Inbetweeners|Fawlty Towers|Mr Bean|Blackadder|Downton Abbey|Line of Duty|Peaky Blinders|Sherlock|
    Game of Thrones|Breaking Bad|The Simpsons|SpongeBob SquarePants|Teletubbies|Neighbours|Home and Away|
    Hollyoaks|Emmerdale|The Crown|Stranger Things|Squid Game|Bridgerton|Gogglebox|Dragons' Den|The Apprentice|
    Come Dine with Me|Grand Designs|Antiques Roadshow|Top of the Pops|Saturday Night Takeaway|Taskmaster|
    Would I Lie to You?|Have I Got News for You|Grange Hill|The Fresh Prince of Bel-Air|Saved by the Bell|
    The Traitors|Ted Lasso|Tweenies`),

  deck('famous', 'Famous Faces', 'Famous people, alive or not', 'star', '#E0A526', `
    David Beckham|Taylor Swift|David Attenborough|Gordon Ramsay|Jamie Oliver|Adele|Ed Sheeran|Beyoncé|
    Elton John|Paul McCartney|Freddie Mercury|Madonna|Michael Jackson|Elvis Presley|Marilyn Monroe|
    Albert Einstein|William Shakespeare|Winston Churchill|King Charles|Harry Styles|Kylie Minogue|Dolly Parton|
    Lionel Messi|Cristiano Ronaldo|Marcus Rashford|Usain Bolt|Serena Williams|Andy Murray|Lewis Hamilton|
    Tom Daley|Tom Cruise|Brad Pitt|Leonardo DiCaprio|Keanu Reeves|Arnold Schwarzenegger|Dwayne Johnson|
    Daniel Craig|Emma Watson|Daniel Radcliffe|Judi Dench|Kate Winslet|Hugh Grant|Mary Berry|Simon Cowell|
    Ant and Dec|Graham Norton|Stephen Fry|Peter Kay|Dawn French|Joanna Lumley|Oprah Winfrey|Bill Gates|
    Steve Jobs|Charles Darwin|Isaac Newton|Leonardo da Vinci|Cleopatra|Henry VIII|Napoleon|Mo Farah|
    Rihanna|Lady Gaga|Stormzy|Bear Grylls|Joe Wicks|Marie Curie`),

  deck('music', 'Singalong', 'Songs everyone can sing', 'note', '#B5527E', `
    Bohemian Rhapsody|Happy Birthday|Wonderwall|Mr Brightside|Sweet Caroline|Don't Look Back in Anger|Hey Jude|
    Yellow Submarine|Let It Go|Wannabe|...Baby One More Time|Livin' on a Prayer|Don't Stop Me Now|I Will Survive|
    Dancing Queen|YMCA|Macarena|Agadoo|Twinkle Twinkle Little Star|Thriller|Billie Jean|Africa|
    Total Eclipse of the Heart|I Will Always Love You|My Heart Will Go On|Rolling in the Deep|Someone Like You|
    Shape of You|Shake It Off|Uptown Funk|Happy|Despacito|Gangnam Style|Single Ladies|Crazy in Love|Umbrella|
    Toxic|Hey Ya!|Seven Nation Army|Angels|Back for Good|Never Gonna Give You Up|Come On Eileen|
    I'm Gonna Be (500 Miles)|Sweet Child o' Mine|Smells Like Teen Spirit|Hotel California|Imagine|Yesterday|
    Stayin' Alive|Rock DJ|Ice Ice Baby|U Can't Touch This|Barbie Girl|Mambo No. 5|Cotton Eye Joe|Tragedy|
    Last Christmas|All I Want for Christmas Is You|Do They Know It's Christmas?|Three Lions|Jerusalem|
    Super Trouper|Hips Don't Lie`),

  deck('animals', 'Animals', 'Animals. Do the noise.', 'paw', '#7F9A74', `
    Elephant|Penguin|Kangaroo|Giraffe|Monkey|Gorilla|Lion|Tiger|Zebra|Hippo|Crocodile|Snake|Frog|Duck|Chicken|
    Cow|Pig|Sheep|Horse|Donkey|Goat|Dog|Cat|Rabbit|Hamster|Goldfish|Shark|Dolphin|Whale|Octopus|Crab|Lobster|
    Jellyfish|Seagull|Pigeon|Owl|Parrot|Flamingo|Peacock|Eagle|Bat|Spider|Bee|Butterfly|Snail|Worm|Ant|
    Mosquito|Squirrel|Hedgehog|Fox|Badger|Deer|Bear|Panda|Koala|Sloth|Camel|Ostrich|Polar bear|Seal|Walrus|
    Tortoise|Llama|T. rex`),

  deck('actout', 'Act It Out', 'Everyday things to mime', 'theatre', '#3E8E8A', `
    Brushing your teeth|Walking the dog|Treading on Lego|Riding a horse|Surfing|Skiing|Bowling|Changing a nappy|
    Ironing a shirt|Doing the washing up|Hoovering|Building a snowman|Making a cup of tea|Eating spaghetti|
    Blowing up a balloon|Taking a selfie|Milking a cow|Juggling|Riding a bike|Rowing a boat|Fishing|
    Changing a tyre|Climbing a ladder|Opening a stuck jar|Putting up a tent|Doing yoga|Lifting weights|
    Playing the drums|Playing the guitar|Conducting an orchestra|Directing traffic|Walking a tightrope|
    Dancing like a robot|Walking like a zombie|Sneezing|Getting hiccups|Stubbing your toe|Getting brain freeze|
    Waiting for a bus in the rain|Parallel parking|Swatting a fly|Popping bubble wrap|Wrapping a present|
    Blowing out birthday candles|Flipping a pancake|Feeding the ducks|Bobbing for apples|Moonwalking|
    Doing the floss|Paddling in a cold sea|Bungee jumping|Skydiving|Riding a rollercoaster|Hailing a taxi|
    Texting with one thumb|Peeling a banana|Shaving|Putting on make-up|Bathing a baby|Carrying too much shopping|
    Building flat-pack furniture|Losing your keys|Bowling a cricket ball|Getting out of a hammock`),

  deck('accents', 'Do the Voice', 'Accents and famous voices', 'mask', '#5B6ABF', `
    Scouse|Geordie|Darth Vader|Brummie|Cockney|Glaswegian|Welsh|Irish|Yorkshire|Cornish|Posh King's English|
    Australian|Texan cowboy|New Yorker|Valley girl|French|Italian|German|Russian|South African|Canadian|Swedish|
    Yoda|Gollum|Homer Simpson|Scooby-Doo|Kermit the Frog|Mickey Mouse|Donald Duck|The Terminator|
    David Attenborough|Mr Bean|Alan Partridge|A Dalek|A sat nav|A robot|A newsreader|A football commentator|
    A weather presenter|A pirate|A toddler|A posh estate agent|A train announcer|A radio DJ|A fitness instructor|
    A hypnotist|A sergeant major|An opera singer|An auctioneer|A monster truck advert|Count Dracula|A witch|
    The King's Christmas speech|Peppa Pig|Shrek|Donkey from Shrek|Michael Caine|Elvis|Marilyn Monroe|
    Joey from Friends|Gordon Ramsay|Sean Connery|A golf commentator|A whispering ASMR video`),

  deck('jobs', 'Jobs', 'Jobs people do', 'spanner', '#8C5A3C', `
    Firefighter|Dentist|Lollipop lady|Doctor|Nurse|Vet|Teacher|Police officer|Paramedic|Builder|Plumber|
    Electrician|Chef|Waiter|Barista|Bartender|Hairdresser|Postman|Bin collector|Bus driver|Taxi driver|Pilot|
    Air steward|Astronaut|Scientist|Farmer|Fisherman|Butcher|Baker|Florist|Gardener|Window cleaner|Mechanic|
    Lifeguard|Footballer|Referee|Judge|Lawyer|Estate agent|Accountant|Journalist|Photographer|
    Weather presenter|DJ|Magician|Clown|Ballet dancer|Personal trainer|Driving instructor|Traffic warden|
    Librarian|Archaeologist|Zookeeper|Beekeeper|Tattoo artist|Surgeon|Optician|Pharmacist|Soldier|Spy|
    Detective|Tour guide|Car salesman|Supermarket cashier|Delivery driver|Influencer`),

  deck('places', 'Places', 'Countries, cities, landmarks', 'globe', '#2F5D7C', `
    The Eiffel Tower|Australia|Blackpool|France|Spain|Italy|Germany|Greece|America|Japan|China|India|Egypt|
    Brazil|Mexico|Canada|Ireland|Scotland|Wales|Jamaica|Iceland|Switzerland|Russia|New Zealand|Turkey|Paris|
    London|New York|Las Vegas|Rome|Venice|Amsterdam|Barcelona|Dublin|Edinburgh|Liverpool|Manchester|Brighton|
    Hollywood|Dubai|Tokyo|Big Ben|Stonehenge|The Pyramids|The Great Wall of China|The Statue of Liberty|
    The Leaning Tower of Pisa|Buckingham Palace|The Grand Canyon|Niagara Falls|Mount Everest|The North Pole|
    The Sahara Desert|The Amazon rainforest|Disneyland|Loch Ness|Benidorm|Ibiza|Hawaii|The Moon|Antarctica|
    Tower Bridge|The London Eye|Sydney Opera House|The Taj Mahal|Mount Rushmore`),

  deck('sport', 'Sport', 'Sports and big moments', 'ball', '#C89B3C', `
    Football|Darts|Penalty shootout|Rugby|Cricket|Tennis|Golf|Snooker|Boxing|Wrestling|Swimming|Diving|
    Gymnastics|Ice skating|Skiing|Snowboarding|Surfing|Skateboarding|Cycling|Formula One|Horse racing|
    The Grand National|Wimbledon|The Olympics|The World Cup|Marathon|Hurdles|High jump|Long jump|Pole vault|
    Javelin|Shot put|Relay race|Rowing|Sailing|Fencing|Archery|Badminton|Table tennis|Basketball|Baseball|
    American football|Ice hockey|Volleyball|Netball|Ten-pin bowling|Crazy golf|Sumo wrestling|Karate|Judo|
    Synchronised swimming|Curling|Bobsleigh|Rock climbing|Red card|Offside|Hole in one|Slam dunk|Mexican wave|
    Egg and spoon race|Sack race|Tug of war|Three-legged race|Dodgeball|Parkrun`),

  deck('rewind', 'Rewind', 'Stuff from the 90s and 00s', 'cassette', '#E2553B', `
    Tamagotchi|Nokia 3310|Spice Girls|Dial-up internet|Pogs|Turkey Twizzlers|Game Boy|Furby|Beanie Babies|
    Slap bracelet|Tazos|Sunny D|Snake on your phone|MSN Messenger|Bebo|MySpace|Floppy disk|Mixtape|Walkman|
    Discman|VHS tape|Blockbuster video|Polly Pocket|Crazy Bones|Razor scooter|Slush Puppie|Frosted tips|
    Butterfly clips|Teletext|Pokémon cards|Disposable camera|Steps|S Club 7|Take That|Westlife|Busted|
    Britney Spears|Backstreet Boys|Crimped hair|Dunkaroos|Buffalo trainers|Burning a CD|Lava lamp|
    Inflatable chair|Dance mat|PlayStation|Nintendo 64|Sega Mega Drive|Crash Bandicoot|Super Mario|
    Sonic the Hedgehog|Tetris|iPod|BlackBerry|Motorola Razr|Rollerblades|Scrunchie|Shell suit|Millennium Bug|
    Pop Idol|Bucket hat|Yo-yo|Sticker album|Mr Frosty`),

  deck('brands', 'Brands', 'Shops, apps and brands', 'bag', '#E2553B', `
    McDonald's|IKEA|Greggs|KFC|Nando's|Subway|Starbucks|Costa|Pret|Tesco|Sainsbury's|Asda|Aldi|Lidl|
    Marks & Spencer|Waitrose|Argos|Primark|Boots|Amazon|Apple|Google|Netflix|Spotify|YouTube|TikTok|Instagram|
    Facebook|WhatsApp|Uber|Deliveroo|Coca-Cola|Pepsi|Irn-Bru|Ribena|Lucozade|Heinz|Marmite|Walkers|Pringles|
    Cadbury|Mars bar|KitKat|Haribo|Nutella|Kellogg's|Lego|Nintendo|PlayStation|Nike|Adidas|Ferrari|Mini|
    Rolex|Ryanair|easyJet|Royal Mail|BBC|Specsavers|Dyson|Duracell|Yorkshire Tea|PG Tips|Domino's`),

  deck('characters', 'Characters', 'Cartoon and film characters', 'monocle', '#5B6ABF', `
    Mickey Mouse|Peppa Pig|Spider-Man|Darth Vader|Hermione Granger|Sherlock Holmes|James Bond|Batman|Superman|
    Wonder Woman|The Hulk|Iron Man|Shrek|Buzz Lightyear|Woody|Elsa|Simba|Dory|SpongeBob|Homer Simpson|
    Bart Simpson|Postman Pat|Bob the Builder|Fireman Sam|Thomas the Tank Engine|Winnie the Pooh|Paddington|
    Super Mario|Sonic|Pikachu|Lara Croft|Scooby-Doo|Tom and Jerry|Bugs Bunny|Garfield|Snoopy|Kermit the Frog|
    Miss Piggy|Cookie Monster|Wallace and Gromit|Shaun the Sheep|Dracula|Frankenstein's monster|
    Father Christmas|The Tooth Fairy|The Easter Bunny|Cinderella|Snow White|Little Red Riding Hood|Peter Pan|
    Captain Hook|Robin Hood|King Arthur|Willy Wonka|Gollum|Yoda|Jack Sparrow|Indiana Jones|Wednesday Addams|
    Barbie|The Grinch|Rudolph|Del Boy|David Brent|Mr Blobby`),

  deck('grub', 'Grub', 'Food and drink', 'pie', '#E0A526', `
    Fish and chips|Full English|Sunday roast|Yorkshire pudding|Bangers and mash|Shepherd's pie|Beans on toast|
    Cheese on toast|Chip butty|Bacon sandwich|Sausage roll|Pork pie|Scotch egg|Cornish pasty|Toad in the hole|
    Spaghetti bolognese|Pizza|Lasagne|Chicken tikka masala|Kebab|Burger|Hot dog|Sushi|Tacos|Fajitas|
    Pot Noodle|Crumpets|Scones|Victoria sponge|Trifle|Jelly and ice cream|Sticky toffee pudding|Apple crumble|
    Custard|Rice pudding|Christmas pudding|Mince pie|Brussels sprouts|Haggis|Black pudding|Crisp sandwich|
    Fish finger sandwich|Jaffa Cakes|Custard creams|Hobnobs|Pancakes|Waffles|Porridge|Cornflakes|
    Boiled egg and soldiers|Prawn cocktail|Cheese board|Fondue|Smoothie|Cup of tea|Hot chocolate|Ice lolly|
    Ninety-nine with a Flake|Candy floss|Doughnut|Battenberg|Spaghetti hoops|Chicken nuggets|Roast potatoes`),
];
