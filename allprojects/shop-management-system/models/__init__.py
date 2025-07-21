from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.chicken import Chicken
from models.feeding import Feeding, FeedFormula
from models.egg import EggCollection, EggProduction
from models.health import HealthRecord, Vaccination
from models.barn import Barn
from models.user import User
from models.notification import Notification
from models.sale import Sale
from models.expense import Expense
from models.customer import Customer 