import { ServerStorage } from "../storage/serverStorage";
import { SpacesStorage } from "../storage/spacesStorage";
import { StorageService } from "../storage/storage";

const useSpaces =
  process.env.DO_SPACES_ACCESS_KEY_ID &&
  process.env.DO_SPACES_SECRET_ACCESS_KEY;
  
const storageService: StorageService = useSpaces
  ? new SpacesStorage()
  : new ServerStorage();

export default storageService;