/**
 * Frequency resources for the typability scorer (CNT-02), authored in-repo.
 *
 * PROVENANCE AND LICENCE (implementation guide §6.5 step 2 requires a licence
 * check on every resource; AGENTS.md rule 6 forbids copying word lists from
 * GPL/AGPL projects):
 *
 *   - These two lists were written from scratch for this repository. No word
 *     list, corpus, n-gram table or dataset was copied, scraped or derived from.
 *   - An isolated English word is not copyrightable subject matter (words and
 *     short phrases are excluded from copyright protection in both US and EU
 *     law), so a list of words carries no protected expression. The resource is
 *     released with the repository under the project's open-core terms and the
 *     non-MIT half of it (see AGENTS.md, D12: only `packages/engine` and
 *     `packages/schemas` are MIT).
 *   - They are APPROXIMATIONS, and the doc says so with numbers: see
 *     docs/typability-scoring.md §3, which reports the measured share of corpus
 *     word tokens each list covers. A list that covers 60% of tokens is a
 *     directional signal, not a dictionary, and the feature that uses it is
 *     weighted accordingly.
 *
 * Determinism: both lists are frozen at module load and never mutated. The sets
 * are built once from frozen arrays, so call order cannot change an answer.
 */

/**
 * The high-frequency list: the ~200 word forms that carry most of an English
 * text's tokens (function words, the most common verbs and nouns).
 *
 * Used for `frequentWordShare`, the spec's "share of high-frequency words"
 * feature (master-spec §6.2, easier direction).
 */
const HIGH_FREQUENCY_SOURCE = `
the of and to a in is you that it he was for on are as with his they at be this have from or one
had by word but not what all were we when your can said there use an each which she do how their
if will up other about out many then them these so some her would make like him into time has look
two more write go see number no way could people my than first water been call who oil its now find
long down day did get come made may part over new sound take only little work know place year live
me back give most very after thing our just name good sentence man think say great where help
through much before line right too mean old any same tell boy follow came want show also around
form three small set put end does another well large must big even such because turn here why ask
went men read need land different home us move try kind hand picture again change off play spell
air away animal house point page letter mother answer found study still learn should america world
high every near add food between own below country plant last school father keep tree never start
city earth eye light thought head under story saw left few while along might close something seem
next hard open example begin life always those both paper together got group often run important
until children side feet car mile night walk white sea began grow took river four carry state once
book hear stop without second later miss idea enough eat face watch far indian really almost let
above girl sometimes mountain cut young talk soon list song being leave family it s body music color
stood sun questions fish area mark dog horse birds problem complete room knew since ever piece told
usually friends easy heard order red door sure become top ship across today during short
better best however low hours black products happened whole measure remember early waves reached
listen wind rock space covered fast several hold himself toward five step morning passed vowel
true hundred against pattern numeral table north slowly money map farm pulled draw voice seen cold
cried plan notice south sing war ground fall king town hall
`;

/**
 * The common-word list: the high-frequency set plus the ordinary content words
 * and inflections an everyday English passage leans on (~850 forms).
 *
 * Used for `knownWordShare`, the easier-direction twin of the spec's "share of
 * non-dictionary words" feature (master-spec §6.2, harder direction). It is NOT
 * a dictionary: proper nouns, technical terms and rare words are counted as
 * non-dictionary here, which is a known over-count, documented in
 * docs/typability-scoring.md §5 "Known biases".
 */
const COMMON_SOURCE = `
able above accept according account across act action activity actually add address administration
admit adult affect after again against age agency agent ago agree agreement ahead air all allow
almost alone along already also although always american among amount analysis and animal another
answer any anyone anything appear apply approach area argue arm around arrive art article artist as
ask assume at attack attention attorney audience author authority available avoid away baby back bad
bag ball bank bar base be beat beautiful because become bed before begin behavior behind believe
benefit best better between beyond big bill billion bit black blood blue board boat body book born
both box boy break bring brother budget build building business but buy call camera campaign can
cancer candidate capital car card care career carry case catch cause cell center central century
certain certainly chair challenge chance change character charge check child choice choose church
citizen city civil claim class clear clearly close coach cold collection college color come commercial
common community company compare computer concern condition conference congress consider consumer
contain continue control cost could country couple course court cover create crime cultural culture
cup current customer cut dark data daughter day dead deal death debate decade decide decision deep
defense degree democrat democratic describe design despite detail determine develop development die
difference different difficult dinner direction director discover discuss discussion disease do
doctor dog door down draw dream drive drop drug during each early east easy eat economic economy
edge education effect effort eight either election else employee end energy enjoy enough enter entire
environment environmental especially establish even evening event ever every everybody everyone
everything evidence exactly example executive exist expect experience expert explain eye face fact
factor fail fall family far fast father fear federal feel feeling few field fight figure fill film
final finally financial find fine finger finish fire firm first fish five floor fly focus follow food
foot for force foreign forget form former forward four free friend from front full fund future game
garden gas general generation get girl give glass go goal good government great green ground group
grow growth guess gun guy hair half hand hang happen happy hard have he head health hear heart heat
heavy help her here herself high him himself his history hit hold home hope hospital hot hotel hour
house how however huge human hundred husband idea identify if image imagine impact important improve
in include including increase indeed indicate individual industry information inside instead
institution interest interesting international interview into investment involve issue it item its
itself job join just keep key kid kill kind kitchen know knowledge land language large last late later
laugh law lawyer lay lead leader learn least leave left leg legal less let letter level lie life
light like likely line list listen little live local long look lose loss lot love low machine magazine
main maintain major majority make man manage management manager many market marriage material matter
may maybe me mean measure media medical meet meeting member memory mention message method middle
might military million mind minute miss mission model modern moment money month more morning most
mother mouth move movement movie much music must my myself name nation national natural nature near
nearly necessary need network never new news newspaper next nice night none nor north not note nothing
notice now number occur off offer office officer official often oil old once one only onto open
operation opportunity option or order organization other others our out outside over own owner page
pain painting paper parent part participant particular particularly partner party pass past patient
pattern pay peace people per perform performance perhaps period person personal phone physical pick
picture piece place plan plant play player point police policy political politics poor popular
population position positive possible power practice prepare present president pressure pretty
prevent price private probably problem process produce product production professional professor
program project property protect prove provide public pull purpose push put quality question quickly
quite race radio raise range rate rather reach read ready real reality realize really reason receive
recent recently recognize record red reduce reflect region relate relationship religious remain
remember remove report represent republican require research resource respond response responsibility
rest result return reveal rich right rise risk road rock role room rule run safe same save say scene
school science scientist score sea season seat second section security see seek seem sell send senior
sense series serious serve service set seven several sex sexual shake share she shoot short shot should
shoulder show side sign significant sim similar simple simply since sing single sister sit site
situation six size skill skin small smile so social society soldier some somebody someone something
sometimes son song soon sort sound source south southern space speak special specific speech spend
sport spring staff stage stand standard star start state statement station stay step still stock
stop store story strategy street strong structure student study stuff style subject success
successful such suddenly suffer suggest summer support sure surface system table take talk task tax
teach teacher team technology television tell ten tend term test than thank that the their them
themselves then theory there these they thing think third this those though thought thousand threat
three through throughout throw thus time today together tonight too top total tough toward town trade
traditional training travel treat treatment tree trial trip trouble true truth try turn two type under
understand unit until up upon use usually value various very victim view violence visit voice vote
wait walk wall want war watch water way weapon wear week weight well west western what whatever when
where whether which while white who whole whom whose why wide wife will win wind window wish with
within without woman wonder word work worker world worry would write writer wrong yard yeah year yes
yet you young your yourself
accepts accepted account accounts across acted actually addition additional addressed allow allows
allowed answering apply applied approach approaches argued arguments arise arising around arrange
arranged ask asked asking attach attached attempt attempted attending audience available
becomes beginning begun begins behalf belief believe believed beneath benefit benefits beside besides
bettering beyond bigger biggest bill billing bits books boring bought bracket brackets brief brings
broken building builds built businesses calling calls came cannot capacity capital caps card cards
career caring cases catching changes channel chapters cheap checked checking checks choose chosen
clicks client clients closing closer code codes coffee cold coming company companys complete completed
completing computer computers concerned condition conditions connect connected considering contain
contains content contents continue continued continues control controlled conversation cook cooks copied
copying corner cost costing count counted counting counts countries country couple coupled course
courses cover covered covering covers create created creates crew crossed cups cuts dealing decide
decided deciding decisions declared deep deeply degrees deliver delivered delivering delivery depends
describe described describing designs desire desk despite destroy destroyed destroying detail detailed
details determine determined develop developed developing development device devices dictionary
did differ difference differences different differently difficult dinner dinners direction directly
disagree disappear disaster discipline discuss discussion discussions divide divisions document
documented documents doing done doubt download downloaded drew drop dropped dropping due during
earlier early earnings earth ease easily eastern edge edges edition editor educated education effect
effectively effects effort efforts eight either elect elected election elections else email emailed
embarrass employ employed employee employees employment empty enable enabled encounter encourage
encouraged enemy energy engage engine engineer engineering enjoy enough enter enters entering entirely
entrance entry envelope equal equally equipment error escape especially essay essentially establish
established estimate evening event events eventually ever every everybody everyone everything evidence
exactly examine example examples exceed excellent except exception exchange excited exciting excuse
exercise exist exists expecting experience expert express extended extremely eye
facing fact factor factors fail failed failing failure failures fair fairly faith fall false familiar
fashion fast fat fate fear feature features feed feel feeling feelings fellow female fight figure
figures file fill filled film final finance financial find fine finger fingers finish finished
fireplace fishing five fix flat flavor flight floor flowers focus focused follow followed following
foods football foot footprint force forehead foreign forest forever forgive forgot forgive form
formal format formation former formula forth found foundation founder fourth fragile frame framework
freedom frequently fresh friend friendly friends friendship frightened front fruit fuel full fully
fun function functions fund funding furniture furthermore future
gain gains gallery gap garage gather gave generally generation generous gently gift glad glance
glass glasses global glove glue goal goals god gold golden golf govern government grace grade gradually
graduate grain grand grandfather grandmother grant grateful grave gray greatly green grocery ground
grounds group groups grow grows growth guarantee guard guess guest guide guideline guilty gun guy
habit half hall hallway hand handful handle hang happens happy hardly hat hate hazard head headed
headline headquarters health healthy hear hearing heart heat heavily heavy heel height helicopter hell
hello helpful hence heritage hero herself hesitate hidden hide hint hire historian historic historical
hobby hockey hold hole holiday holy home homework honest honey honor hope hopefully horizon horror
horse hospital hostile hot hotel hour house household housing huge human humor hundred hungry hunter
hurry hurt husband hypothesis
ice idea ideal identical identify identity ideology ignore illness illustrate image imagination
immediate immediately immigrant impact implement implication importance important impose impossible
impression impressive improve improvement inch incident include including income increase indeed
independent index indicate indication individual industrial industry infant infection inflation
inform informal information initial initially initiative injury inner innocent inquiry inside insight
insist inspire install instance instead institute instruction instrument insult insurance intelligence
intelligent intend intense intention interact interest interested interesting internal interpretation
interview interviews introduce introduction invent investigate investigation investigator investment
invite involved involvement iron island isolate issue issued item items
jacket jail jazz jeans job jobs join joined joint joke jokes journey joy judge judgment juice jump
junction jungle junior jury just justice justify
keen keep kept kettle key keys kick kid kids kill killed killer killing kind kindly king kiss kitchen
knee kneel knife knock knot know knowledge
label labor lack ladder lady lake lamp land landed landscape language languages laptop large
largely last late laugh laughed laughter launch law lawn lawsuit lawyer lay layer lead leader
leadership leading leads leaf league lean leap learn learned learning least leather leave leaves
left leg legacy legal legend legislation legitimate lemon lend length less lesson let letter
letters level liability liberal liberty library license lie life lifestyle lifetime lift light
lightning likely limitation limited line linear link lion lip liquid list literature little live
lively living load loan local locate location lock logic lonely long look loose lose loss lost lot
loud love lovely lover low lower loyalty luck lucky lunch lung
machine mad magazine mail main mainly maintain maintenance major majority make maker makeup male mall
man manage managed manager manner manufacturer map maps march margin mark market marketing marriage
married marry mask mass massive master match matching math matter matters mature maximum may maybe
mayor meal mean meaning means meanwhile measure measurement meat mechanism media medical medicine
medium meet meeting member membership memory mental mention menu mere merge merit mess message
messages metal meter method middle midnight might mild mile military milk mind mine minimum minister
minor minority minute miracle mirror miss missing mission mistake mix mixture mobile mode model
models moderate modern modest modify mom moment money monitor month mood moon moral more moreover
morning mortgage most mostly mother motion motivate motivation motor mount mountain mouse mouth move
movement movie movies mud multiple murder muscle museum music musician mystery myth
nail naked name named namespace narrow nation national native natural naturally nature navy near
nearly neat neck need needed needle negative neglect negotiate neighbor neighborhood neither nerve
nervous nest net network neutral never nevertheless new newly news newspaper next nice night nine
no nobody nod noise nomination none nonsense noon nor normal normally north northern nose not note
notebook nothing notice notion novel nowhere nuclear number numerous nurse nut
oak obey object objective obligation observation observe obtain obvious obviously occasion occasionally
occupation occupy occur ocean odd odds offense offensive offer office officer official officially
often oil okay old olive omit once ongoing onion online only onto open opening operate operation
operator opinion opponent opportunity oppose opposite opposition option orange orbit order ordinary
organic organization organize orientation origin original originally other others otherwise ought
ounce ourselves outcome outdoor outer outline output outside oven overcome overlap overcome overhead
overlap overseas overwhelm owe owed owes own owner ownership
pace pack package page pages pain painful paint painter painting pair pale palm pan panel panic paper
parent parents park part participate participation particular particularly partly partner partnership
party pass passage passenger passion past patch path patient pattern pause pave paw pay payment peace
peak penalty pencil penny people pepper per perceive percentage perception perfect perfectly perform
performance perhaps period permanent permission permit person personal personality personally
personnel perspective persuade pet phase phenomenon philosophy phone photograph phrase physical
physically piano pick picture pie piece pile pilot pine pink pipe pitch pity place plain plan
planet planning plant plastic plate platform play player playing playground playstation please pleasure
plenty plot plug plus pocket poem poet poetry point poison pole police policy polish polite political
politics poll pollution pool poor pop popular population porch port portion portrait pose position
positive possess possibility possible possibly post pot potato potential potentially pound pour
poverty powder power powerful practical practice pray prayer precisely predict prefer pregnant
prejudice preliminary premise premium preparation prepare prescription presence present presentation
preserve president presidential press pressure prestige presumably pretend pretty prevent previous
previously prey price pride priest primarily primary prime primitive princess principle print
printer prior priority prison prisoner privacy private privilege prize probably problem procedure
proceed process produce producer product production productive profession professional professor
profile profit program progress prohibit project projection prominent promise promote prompt proof
proper properly property proposal propose prospect protect protection protein protest proud prove
provided provider providing province provision psychological psychology public publication publicly
publish pull punishment purchase pure purpose pursue push put puzzle
qualify quality quarter quarterback question quick quickly quiet quietly quit quite quote
race racial radical radio rage rail rain raise range rank rapid rapidly rare rarely rate rather
rating ratio raw reach react reaction read reader reading ready real reality realize really realm
rear reason reasonable recall receive recent recently recipe recognition recognize recommend
recommendation record recording recover recovery recruit red reduce reduction refer reference
referring reflect reflection reform refugee refuse regard regarding regardless regime region regional
register regular regularly regulate regulation reinforce reject relate relation relationship
relative relatively relax release relevant reliable relief religion religious rely remain remaining
remark remarkable remember remind remote removal remove repeat repeatedly replace reply report
reporter represent representation representative republic reputation request require requirement
research researcher resemble reservation reside residence resident resist resistance resolution
resolve resort resource respect respond response responsibility responsible rest restaurant restore
restrict restriction result retain retire retirement return reveal revenue reverse review revolution
reward rhythm rice rich rid ride rifle right ring rise risk ritual rival river road robot rock
rocket role roll roof room root rope rose rough roughly round route routine row rub rule run runner
running rural rush
sacred sacrifice sad safe safety sake salad salary sale sales salt same sample sanction sand
satellite satisfaction satisfy sauce save saving say scale scandal scared scenario scene schedule
scheme scholar scholarship school science scientist scope score scratch scream screen script sea
search season seat second secret secretary section sector secure security see seed seek seem segment
seize seldom select selection self sell senate send senior sense sensitive sentence separate sequence
series serious servant serve service session settle settlement seven several severe sex shade shadow
shake shall shallow shame shape share sharp she sheet shelf shell shelter shift shine ship shirt shock
shoe shoot shop shopping shore short shortly shot should shoulder shout show shower shrug shut sick
side sight sign signal significance significant significantly silence silent silver similar similarly
simple simply sin since sing singer single sink sir sister sit site situation six size ski skill skin
skip skirt sky slave sleep slice slide slight slightly slip slope slow slowly small smart smell smile
smoke smooth snap snow so social society soft software soil solar soldier sole solid solution
solve some somebody somehow someone something sometimes somewhat somewhere son song soon sophisticated
sorry sort soul sound soup source south southern space spare spark speak speaker specialist species
specific specify spectrum speech speed spending sphere spirit spiritual spite split spokesman sport
spot spread spring square squeeze stadium staff stage stair stake stand standard standing star stare
start starting startling state statement station statistics status stay steady steal steam steel step
stick still stimulate stir stock stomach stone stop storage store storm story straight strain
strange strategy stream street strength strengthen stress stretch strict strike string strip stroke
strong strongly structure struggle student studio study stuff stupid style subject submit subsequent
substance substantial succeed success successful successfully such sudden suddenly sue suffer sufficient
sugar suggest suggestion suit suitable sum summary summer summit sun super supply support supposedly
supreme sure surely surface surgery surprise surprising surround survey survival survivor suspect
suspicion sustain swear sweep sweet swell swift swim swing switch symbol symptom system
table tablespoon tactic tail take tale talent talk tall tank tap tape target task taste tax taxpayer
tea teach teacher teaching team tear teaspoon technical technique technology teen teenager telephone
telescope television tell temperature temple temporary ten tend tendency tennis tension tent term terms
terrible territory terror terrorist test testify testimony testing text than thank thanks that theater
theater theft their them theme themselves then theory therapy there therefore these they thick thin
thing think thinking third thirty this thorough though thought thousand thread threat threaten three
throat through throughout throw thumb thunder thus ticket tie tight till timber time tiny tip tired
tissue title to tobacco today toe together toilet tomato tomorrow tone tongue tonight too tool tooth
top topic torch total totally touch tough tour tourist tournament toward towel tower town toxic toy
trace track trade tradition traditional traffic tragedy trail train trainer training transfer
transform transition translate transportation trap travel treat treatment treaty tree tremendous trend
trial tribe trick trip triumph troop trouble truck true truly trunk trust truth try tube tunnel
turn twelve twenty twice twin twist two type typical typically
ugly ultimate ultimately unable uncle uncomfortable under undergo underlying understand understanding
unfortunately unhappy uniform union unique unit united universal universe university unknown unless
unlike unlikely until unusual up upon upper urban urge urgent usage use used useful useless usual
usually utility
vacation valley valuable value van variable variation variety various vary vast vegetable vehicle
venture venue verbal verdict verify version versus vertical very vessel veteran via victim victory
video viewer viewing village violate violence violent virtually virtue virus visible vision visit
visitor visual vital voice volume volunteer vote voter versus via victory vintage violate violent
virtue vision visit visitor visual vital vocabulary voice volume volunteer vote voter
wagon waist wait wake walk wall wander want war warm warn warning wash waste watch water wave way
weak wealth weapon wear weather wedding week weekend weekly weigh weight welcome welfare well west
western wet what whatever wheat wheel whenever whereas wherever whether which while whisper white
who whole whom whose why wide widespread wife wild willing win wind window wine wing winner winter
wipe wire wisdom wise wish witness woman wonder wonderful wood wooden wool word work worker working
works workshop world worried worry worse worst worth would wound wrap wrist write writer writing
written wrong
yard yeah year yell yellow yes yesterday yet yield you young your yourself youth
zero zone
`;

/**
 * Every distinct word in the high-frequency list, in list order.
 *
 * Entries are letters only. The tokenizer in `../features.ts` lowercases and
 * strips apostrophes before a lookup, so a contracted form in the list ("it's")
 * could never match anything; keeping the lists letters-only makes that
 * impossible rather than merely unlikely.
 */
export const HIGH_FREQUENCY_WORDS: ReadonlyArray<string> = Object.freeze([
  ...new Set(HIGH_FREQUENCY_SOURCE.split(/\s+/).filter((word) => /^[a-z]+$/.test(word))),
]);

/**
 * The common-word list: the high-frequency set plus the ordinary content words
 * and inflections an everyday English passage leans on. Built as the union of
 * the two authored sources so the property "every high-frequency word is a
 * known word" holds by construction rather than by two hand-edited lists
 * agreeing by luck.
 *
 * Used for `knownWordShare`, the easier-direction twin of the spec's "share of
 * non-dictionary words" feature (master-spec §6.2, harder direction). It is NOT
 * a dictionary: proper nouns, technical terms and rare words are counted as
 * non-dictionary here, which is a known over-count, documented in
 * docs/typability-scoring.md §5 "Known biases".
 */
export const COMMON_WORDS: ReadonlyArray<string> = Object.freeze([
  ...new Set([
    ...COMMON_SOURCE.split(/\s+/).filter((word) => /^[a-z]+$/.test(word)),
    ...HIGH_FREQUENCY_WORDS,
  ]),
]);

const HIGH_FREQUENCY_SET: ReadonlySet<string> = new Set(HIGH_FREQUENCY_WORDS);
const COMMON_SET: ReadonlySet<string> = new Set(COMMON_WORDS);

/** Sizes are part of the published model config, so they are exported and asserted. */
export const HIGH_FREQUENCY_WORD_COUNT = HIGH_FREQUENCY_SET.size;
export const COMMON_WORD_COUNT = COMMON_SET.size;

/** Word-form membership test. Non-lowercase or non-alphabetic input is never in the list. */
export function isHighFrequencyWord(word: string): boolean {
  return HIGH_FREQUENCY_SET.has(word);
}

/** Word-form membership test. See `isHighFrequencyWord` for the input contract. */
export function isCommonWord(word: string): boolean {
  return COMMON_SET.has(word);
}
